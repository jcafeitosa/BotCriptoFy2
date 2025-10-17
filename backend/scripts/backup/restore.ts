#!/usr/bin/env bun
/**
 * Database Restore Script
 * Disaster recovery system for PostgreSQL database restoration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { loadBackupConfig, type BackupConfig } from './backup.config';
import { downloadFromS3 } from './s3-upload';

const execAsync = promisify(exec);

interface RestoreOptions {
  backupFile: string;
  verifyChecksums: boolean;
  createDatabase: boolean;
  dropExisting: boolean;
  pointInTime?: Date;
  dryRun: boolean;
}

interface RestoreResult {
  success: boolean;
  restoredFrom: string;
  duration: number;
  tablesRestored?: number;
  error?: string;
}

class RestoreManager {
  private config: BackupConfig;
  private startTime: number = 0;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    const backupPath = this.config.storage.local.path;

    try {
      const files = await fs.readdir(backupPath);
      const backupFiles = files
        .filter(f => f.endsWith('.dump') || f.endsWith('.sql') || f.endsWith('.gz') || f.endsWith('.enc'))
        .sort()
        .reverse(); // Most recent first

      return backupFiles;
    } catch (error: any) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Verify backup file checksums
   */
  private async verifyChecksums(filePath: string): Promise<boolean> {
    console.log('🔄 Verifying backup checksums...');

    const checksumPath = `${filePath}.checksums`;

    try {
      const checksumData = await fs.readFile(checksumPath, 'utf-8');
      const expectedChecksums = JSON.parse(checksumData);

      const fileBuffer = await fs.readFile(filePath);
      const actualMd5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
      const actualSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      if (actualMd5 !== expectedChecksums.md5) {
        console.error('❌ MD5 checksum mismatch!');
        console.error(`   Expected: ${expectedChecksums.md5}`);
        console.error(`   Actual:   ${actualMd5}`);
        return false;
      }

      if (actualSha256 !== expectedChecksums.sha256) {
        console.error('❌ SHA256 checksum mismatch!');
        console.error(`   Expected: ${expectedChecksums.sha256}`);
        console.error(`   Actual:   ${actualSha256}`);
        return false;
      }

      console.log('✅ Checksums verified successfully');
      return true;
    } catch (error: any) {
      console.warn(`⚠️  Checksum verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Decrypt backup file
   */
  private async decryptBackup(encryptedPath: string): Promise<string> {
    if (!this.config.options.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const decryptedPath = encryptedPath.replace('.enc', '');

    console.log('🔄 Decrypting backup...');

    try {
      const key = crypto.scryptSync(this.config.options.encryptionKey, 'salt', 32);
      const encryptedData = await fs.readFile(encryptedPath);

      // Extract IV (first 16 bytes)
      const iv = encryptedData.slice(0, 16);
      const encrypted = encryptedData.slice(16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      await fs.writeFile(decryptedPath, decrypted);

      console.log(`✅ Backup decrypted: ${decryptedPath}`);
      return decryptedPath;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Decompress backup file
   */
  private async decompressBackup(compressedPath: string): Promise<string> {
    const decompressedPath = compressedPath.replace('.gz', '');

    console.log('🔄 Decompressing backup...');

    try {
      await execAsync(`gunzip -c ${compressedPath} > ${decompressedPath}`);
      console.log(`✅ Backup decompressed: ${decompressedPath}`);
      return decompressedPath;
    } catch (error: any) {
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  /**
   * Ask for user confirmation
   */
  private async askConfirmation(message: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`${message} (yes/no): `, answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Drop existing database
   */
  private async dropDatabase(): Promise<void> {
    const { database } = this.config;

    console.log('🔄 Dropping existing database...');

    const command = `psql -h ${database.host} -p ${database.port} -U ${database.user} -c "DROP DATABASE IF EXISTS ${database.name};"`;
    const env = { ...process.env, PGPASSWORD: database.password };

    try {
      await execAsync(command, { env });
      console.log('✅ Database dropped');
    } catch (error: any) {
      throw new Error(`Failed to drop database: ${error.message}`);
    }
  }

  /**
   * Create new database
   */
  private async createDatabase(): Promise<void> {
    const { database } = this.config;

    console.log('🔄 Creating new database...');

    const command = `psql -h ${database.host} -p ${database.port} -U ${database.user} -c "CREATE DATABASE ${database.name};"`;
    const env = { ...process.env, PGPASSWORD: database.password };

    try {
      await execAsync(command, { env });
      console.log('✅ Database created');
    } catch (error: any) {
      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  /**
   * Restore database from backup file
   */
  private async restoreDatabaseBackup(filePath: string): Promise<void> {
    const { database } = this.config;

    console.log('🔄 Restoring database from backup...');

    // Determine restore command based on file format
    const isPgRestore = filePath.endsWith('.dump');
    let command: string;

    if (isPgRestore) {
      // Use pg_restore for custom format
      command = [
        'pg_restore',
        `-h ${database.host}`,
        `-p ${database.port}`,
        `-U ${database.user}`,
        `-d ${database.name}`,
        '--verbose',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-acl',
      ].join(' ') + ` ${filePath}`;
    } else {
      // Use psql for plain SQL format
      command = `psql -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -f ${filePath}`;
    }

    const env = { ...process.env, PGPASSWORD: database.password };

    try {
      const { stdout, stderr } = await execAsync(command, { env, maxBuffer: 50 * 1024 * 1024 });

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('⚠️  Restore warnings:', stderr);
      }

      if (stdout) {
        console.log(stdout);
      }

      console.log('✅ Database restored successfully');
    } catch (error: any) {
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  /**
   * Get table count for verification
   */
  private async getTableCount(): Promise<number> {
    const { database } = this.config;

    const command = `psql -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`;
    const env = { ...process.env, PGPASSWORD: database.password };

    try {
      const { stdout } = await execAsync(command, { env });
      return parseInt(stdout.trim());
    } catch (error: any) {
      console.warn('⚠️  Could not verify table count:', error.message);
      return 0;
    }
  }

  /**
   * Perform complete restore process
   */
  async performRestore(options: RestoreOptions): Promise<RestoreResult> {
    this.startTime = Date.now();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Database Restore Process');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📦 Backup: ${options.backupFile}`);
    console.log(`🗄️  Database: ${this.config.database.name}`);
    console.log(`🔍 Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Construct full backup path
      let backupPath: string;
      if (path.isAbsolute(options.backupFile)) {
        backupPath = options.backupFile;
      } else {
        backupPath = path.join(this.config.storage.local.path, options.backupFile);
      }

      // Check if backup file exists locally
      try {
        await fs.access(backupPath);
      } catch {
        // Try to download from S3 if enabled
        if (this.config.storage.s3?.enabled) {
          console.log('🔄 Backup not found locally, downloading from S3...');
          await downloadFromS3(this.config.storage.s3, options.backupFile, backupPath);
          console.log('✅ Backup downloaded from S3');
        } else {
          throw new Error(`Backup file not found: ${backupPath}`);
        }
      }

      // Verify checksums if requested
      if (options.verifyChecksums) {
        const isValid = await this.verifyChecksums(backupPath);
        if (!isValid) {
          throw new Error('Checksum verification failed. Backup may be corrupted.');
        }
      }

      // Decrypt if encrypted
      if (backupPath.endsWith('.enc')) {
        backupPath = await this.decryptBackup(backupPath);
      }

      // Decompress if compressed
      if (backupPath.endsWith('.gz')) {
        backupPath = await this.decompressBackup(backupPath);
      }

      if (options.dryRun) {
        console.log('\n✅ DRY RUN: All pre-restore checks passed');
        console.log('   - Backup file exists and is accessible');
        console.log('   - Checksums verified (if enabled)');
        console.log('   - Decryption successful (if encrypted)');
        console.log('   - Decompression successful (if compressed)');
        console.log('\n⚠️  No changes were made to the database');

        return {
          success: true,
          restoredFrom: backupPath,
          duration: Date.now() - this.startTime,
        };
      }

      // Confirm destructive operation
      if (options.dropExisting) {
        console.log('\n⚠️  WARNING: This operation will DROP the existing database!');
        const confirmed = await this.askConfirmation('Are you sure you want to continue?');

        if (!confirmed) {
          console.log('❌ Restore cancelled by user');
          process.exit(0);
        }
      }

      // Drop existing database if requested
      if (options.dropExisting) {
        await this.dropDatabase();
      }

      // Create database if requested
      if (options.createDatabase) {
        await this.createDatabase();
      }

      // Restore database
      await this.restoreDatabaseBackup(backupPath);

      // Verify restoration
      const tableCount = await this.getTableCount();

      const duration = Date.now() - this.startTime;

      const result: RestoreResult = {
        success: true,
        restoredFrom: backupPath,
        duration,
        tablesRestored: tableCount,
      };

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ RESTORE COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 Restored from: ${path.basename(backupPath)}`);
      console.log(`📊 Tables restored: ${tableCount}`);
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return result;
    } catch (error: any) {
      const duration = Date.now() - this.startTime;

      const result: RestoreResult = {
        success: false,
        restoredFrom: options.backupFile,
        error: error.message,
        duration,
      };

      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ RESTORE FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ Error: ${error.message}`);
      console.error(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      throw error;
    }
  }

  /**
   * Interactive restore mode
   */
  async interactiveRestore(): Promise<RestoreResult> {
    console.log('🔍 Scanning for available backups...\n');

    const backups = await this.listBackups();

    if (backups.length === 0) {
      throw new Error('No backups found');
    }

    console.log('Available backups:');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('\nSelect backup number to restore: ', async answer => {
        rl.close();

        const index = parseInt(answer) - 1;
        if (index < 0 || index >= backups.length) {
          reject(new Error('Invalid backup selection'));
          return;
        }

        const selectedBackup = backups[index];

        try {
          const result = await this.performRestore({
            backupFile: selectedBackup,
            verifyChecksums: true,
            createDatabase: false,
            dropExisting: false,
            dryRun: false,
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);

  try {
    const config = loadBackupConfig();
    const manager = new RestoreManager(config);

    // Interactive mode if no arguments
    if (args.length === 0) {
      await manager.interactiveRestore();
      process.exit(0);
    }

    // Parse command line arguments
    const options: RestoreOptions = {
      backupFile: args[0],
      verifyChecksums: !args.includes('--skip-verify'),
      createDatabase: args.includes('--create-db'),
      dropExisting: args.includes('--drop-existing'),
      dryRun: args.includes('--dry-run'),
    };

    await manager.performRestore(options);
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

export { RestoreManager, type RestoreOptions, type RestoreResult };
