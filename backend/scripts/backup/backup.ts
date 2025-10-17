#!/usr/bin/env bun
/**
 * Database Backup Script
 * Automated PostgreSQL backup with compression, encryption, and cloud upload
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { loadBackupConfig, type BackupConfig } from './backup.config';
import { notifyBackupStatus } from './notify';
import { uploadToS3 } from './s3-upload';

const execAsync = promisify(exec);

interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  size?: number;
  duration?: number;
  error?: string;
  checksums?: {
    md5: string;
    sha256: string;
  };
}

class BackupManager {
  private config: BackupConfig;
  private startTime: number = 0;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  /**
   * Generate backup filename with timestamp
   */
  private generateBackupFileName(type: 'daily' | 'weekly' | 'monthly' = 'daily'): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const extension = this.config.options.format === 'custom' ? 'dump' : 'sql';

    return `${this.config.database.name}_${type}_${timestamp}_${time}.${extension}`;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    const backupPath = this.config.storage.local.path;

    try {
      await fs.access(backupPath);
    } catch {
      await fs.mkdir(backupPath, { recursive: true });
      console.log(`✅ Created backup directory: ${backupPath}`);
    }
  }

  /**
   * Create database backup using pg_dump
   */
  private async createDatabaseBackup(filePath: string): Promise<void> {
    const { database, options } = this.config;

    // Build pg_dump command
    const pgDumpArgs = [
      'pg_dump',
      `-h ${database.host}`,
      `-p ${database.port}`,
      `-U ${database.user}`,
      `-d ${database.name}`,
      `-F ${options.format}`,
    ];

    // Add compression if enabled
    if (options.compression && options.format === 'custom') {
      pgDumpArgs.push(`-Z ${options.compressionLevel}`);
    }

    // Add parallel jobs for faster backup
    if (options.parallel && options.format === 'directory') {
      pgDumpArgs.push(`-j ${options.parallelJobs}`);
    }

    // Include large objects
    if (options.includeLargeObjects) {
      pgDumpArgs.push('-b');
    }

    // Add file output
    pgDumpArgs.push(`-f ${filePath}`);

    const command = pgDumpArgs.join(' ');

    console.log('🔄 Starting database backup...');
    console.log(`Command: ${command.replace(database.password, '****')}`);

    // Set password via environment variable for security
    const env = { ...process.env, PGPASSWORD: database.password };

    try {
      const { stdout, stderr } = await execAsync(command, { env });

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('⚠️  pg_dump warnings:', stderr);
      }

      if (stdout) {
        console.log(stdout);
      }

      console.log('✅ Database backup completed');
    } catch (error: any) {
      throw new Error(`pg_dump failed: ${error.message}`);
    }
  }

  /**
   * Compress backup file using gzip
   */
  private async compressBackup(filePath: string): Promise<string> {
    const compressedPath = `${filePath}.gz`;

    console.log('🔄 Compressing backup...');

    try {
      await execAsync(`gzip -${this.config.options.compressionLevel} ${filePath}`);
      console.log(`✅ Backup compressed: ${compressedPath}`);
      return compressedPath;
    } catch (error: any) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Encrypt backup file using AES-256
   */
  private async encryptBackup(filePath: string): Promise<string> {
    if (!this.config.options.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const encryptedPath = `${filePath}.enc`;

    console.log('🔄 Encrypting backup...');

    try {
      const key = crypto.scryptSync(this.config.options.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      const input = await fs.readFile(filePath);
      const encrypted = Buffer.concat([iv, cipher.update(input), cipher.final()]);

      await fs.writeFile(encryptedPath, encrypted);
      await fs.unlink(filePath); // Remove unencrypted file

      console.log(`✅ Backup encrypted: ${encryptedPath}`);
      return encryptedPath;
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Calculate file checksums for verification
   */
  private async calculateChecksums(filePath: string): Promise<{ md5: string; sha256: string }> {
    console.log('🔄 Calculating checksums...');

    const fileBuffer = await fs.readFile(filePath);

    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    console.log(`✅ MD5: ${md5}`);
    console.log(`✅ SHA256: ${sha256}`);

    return { md5, sha256 };
  }

  /**
   * Get file size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Perform complete backup process
   */
  async performBackup(type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<BackupResult> {
    this.startTime = Date.now();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Database Backup Process');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📦 Type: ${type}`);
    console.log(`🗄️  Database: ${this.config.database.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Generate backup file path
      const fileName = this.generateBackupFileName(type);
      const filePath = path.join(this.config.storage.local.path, fileName);

      // Create database backup
      await this.createDatabaseBackup(filePath);

      // Get initial file info
      let currentFilePath = filePath;
      let fileSize = await this.getFileSize(currentFilePath);

      console.log(`📊 Initial backup size: ${this.formatFileSize(fileSize)}`);

      // Compress if enabled and format is not custom (custom format has built-in compression)
      if (this.config.options.compression && this.config.options.format !== 'custom') {
        currentFilePath = await this.compressBackup(currentFilePath);
        fileSize = await this.getFileSize(currentFilePath);
        console.log(`📊 Compressed size: ${this.formatFileSize(fileSize)}`);
      }

      // Encrypt if enabled
      if (this.config.options.encryption) {
        currentFilePath = await this.encryptBackup(currentFilePath);
        fileSize = await this.getFileSize(currentFilePath);
        console.log(`📊 Encrypted size: ${this.formatFileSize(fileSize)}`);
      }

      // Calculate checksums for verification
      const checksums = await this.calculateChecksums(currentFilePath);

      // Save checksum file
      const checksumPath = `${currentFilePath}.checksums`;
      await fs.writeFile(checksumPath, JSON.stringify(checksums, null, 2));

      // Upload to S3 if enabled
      if (this.config.storage.s3?.enabled) {
        console.log('\n🔄 Uploading to S3...');
        await uploadToS3(this.config.storage.s3, currentFilePath, path.basename(currentFilePath));
        await uploadToS3(this.config.storage.s3, checksumPath, path.basename(checksumPath));
        console.log('✅ S3 upload completed');
      }

      const duration = Date.now() - this.startTime;

      const result: BackupResult = {
        success: true,
        filePath: currentFilePath,
        fileName: path.basename(currentFilePath),
        size: fileSize,
        duration,
        checksums,
      };

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 File: ${result.fileName}`);
      console.log(`📊 Size: ${this.formatFileSize(result.size!)}`);
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`🔐 MD5: ${checksums.md5}`);
      console.log(`🔐 SHA256: ${checksums.sha256}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Send success notification
      await notifyBackupStatus(this.config, result);

      return result;
    } catch (error: any) {
      const duration = Date.now() - this.startTime;

      const result: BackupResult = {
        success: false,
        error: error.message,
        duration,
      };

      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ BACKUP FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ Error: ${error.message}`);
      console.error(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Send failure notification
      await notifyBackupStatus(this.config, result);

      throw error;
    }
  }
}

// CLI execution
if (import.meta.main) {
  const type = (process.argv[2] || 'daily') as 'daily' | 'weekly' | 'monthly';

  try {
    const config = loadBackupConfig();
    const manager = new BackupManager(config);
    await manager.performBackup(type);
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

export { BackupManager, type BackupResult };
