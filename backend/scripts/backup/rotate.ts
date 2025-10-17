#!/usr/bin/env bun
/**
 * Backup Rotation Script
 * Implements retention policy and cleanup of old backups
 */

import fs from 'fs/promises';
import path from 'path';
import { loadBackupConfig, type BackupConfig } from './backup.config';
import { deleteFromS3, listS3Backups } from './s3-upload';

interface BackupFile {
  path: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'unknown';
  date: Date;
  size: number;
}

class BackupRotationManager {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  /**
   * Parse backup filename to extract metadata
   */
  private parseBackupFile(fileName: string): BackupFile | null {
    // Example: beecripto_daily_2025-01-15_14-30-00.dump.gz.enc
    const regex = /^(.+?)_(daily|weekly|monthly)_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/;
    const match = fileName.match(regex);

    if (!match) {
      return null;
    }

    const [, , type, dateStr, timeStr] = match;
    const dateTimeStr = `${dateStr}T${timeStr.replace(/-/g, ':')}`;
    const date = new Date(dateTimeStr);

    return {
      path: path.join(this.config.storage.local.path, fileName),
      name: fileName,
      type: type as 'daily' | 'weekly' | 'monthly',
      date,
      size: 0, // Will be filled later
    };
  }

  /**
   * Get all backup files with metadata
   */
  private async getLocalBackups(): Promise<BackupFile[]> {
    const backupPath = this.config.storage.local.path;

    try {
      const files = await fs.readdir(backupPath);
      const backupFiles: BackupFile[] = [];

      for (const file of files) {
        if (file.endsWith('.checksums')) continue;

        const parsed = this.parseBackupFile(file);
        if (parsed) {
          const stats = await fs.stat(parsed.path);
          parsed.size = stats.size;
          backupFiles.push(parsed);
        }
      }

      return backupFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error: any) {
      throw new Error(`Failed to list local backups: ${error.message}`);
    }
  }

  /**
   * Calculate backup age in days
   */
  private getBackupAgeInDays(backup: BackupFile): number {
    const now = new Date();
    const ageMs = now.getTime() - backup.date.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine if backup should be kept based on retention policy
   */
  private shouldKeepBackup(backup: BackupFile, allBackups: BackupFile[]): boolean {
    const { retention } = this.config.storage.local;
    const age = this.getBackupAgeInDays(backup);

    // Always keep the most recent backup
    if (backup === allBackups[0]) {
      return true;
    }

    switch (backup.type) {
      case 'daily':
        return age < retention.daily;

      case 'weekly':
        return age < retention.weekly * 7;

      case 'monthly':
        return age < retention.monthly * 30;

      default:
        return false;
    }
  }

  /**
   * Delete backup file and associated checksum
   */
  private async deleteBackupFile(backup: BackupFile): Promise<void> {
    try {
      await fs.unlink(backup.path);

      // Try to delete checksum file if it exists
      try {
        await fs.unlink(`${backup.path}.checksums`);
      } catch {
        // Checksum file may not exist
      }

      console.log(`✅ Deleted: ${backup.name}`);
    } catch (error: any) {
      console.error(`⚠️  Failed to delete ${backup.name}: ${error.message}`);
    }
  }

  /**
   * Rotate local backups based on retention policy
   */
  async rotateLocalBackups(): Promise<{ kept: number; deleted: number; freedSpace: number }> {
    console.log('🔄 Rotating local backups...');

    const backups = await this.getLocalBackups();

    if (backups.length === 0) {
      console.log('ℹ️  No backups found');
      return { kept: 0, deleted: 0, freedSpace: 0 };
    }

    console.log(`📊 Found ${backups.length} backup(s)\n`);

    let kept = 0;
    let deleted = 0;
    let freedSpace = 0;

    for (const backup of backups) {
      const age = this.getBackupAgeInDays(backup);
      const shouldKeep = this.shouldKeepBackup(backup, backups);

      if (shouldKeep) {
        console.log(`✅ Keeping: ${backup.name} (${age} days old)`);
        kept++;
      } else {
        console.log(`🗑️  Deleting: ${backup.name} (${age} days old, exceeds retention)`);
        await this.deleteBackupFile(backup);
        deleted++;
        freedSpace += backup.size;
      }
    }

    return { kept, deleted, freedSpace };
  }

  /**
   * Rotate S3 backups based on retention policy
   */
  async rotateS3Backups(): Promise<{ kept: number; deleted: number }> {
    if (!this.config.storage.s3?.enabled) {
      return { kept: 0, deleted: 0 };
    }

    console.log('\n🔄 Rotating S3 backups...');

    const s3Files = await listS3Backups(this.config.storage.s3);

    if (s3Files.length === 0) {
      console.log('ℹ️  No S3 backups found');
      return { kept: 0, deleted: 0 };
    }

    console.log(`📊 Found ${s3Files.length} S3 backup(s)\n`);

    const s3Backups: BackupFile[] = s3Files
      .map(file => {
        const parsed = this.parseBackupFile(file);
        return parsed ? { ...parsed, path: file } : null;
      })
      .filter((b): b is BackupFile => b !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    let kept = 0;
    let deleted = 0;

    for (const backup of s3Backups) {
      const age = this.getBackupAgeInDays(backup);
      const shouldKeep = this.shouldKeepBackup(backup, s3Backups);

      if (shouldKeep) {
        console.log(`✅ Keeping S3: ${backup.name} (${age} days old)`);
        kept++;
      } else {
        console.log(`🗑️  Deleting S3: ${backup.name} (${age} days old, exceeds retention)`);
        await deleteFromS3(this.config.storage.s3!, backup.path);
        deleted++;
      }
    }

    return { kept, deleted };
  }

  /**
   * Perform complete rotation on local and S3 backups
   */
  async performRotation(): Promise<void> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Starting Backup Rotation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📁 Local path: ${this.config.storage.local.path}`);
    console.log(`📝 Retention policy:`);
    console.log(`   - Daily: ${this.config.storage.local.retention.daily} days`);
    console.log(`   - Weekly: ${this.config.storage.local.retention.weekly} weeks`);
    console.log(`   - Monthly: ${this.config.storage.local.retention.monthly} months`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Rotate local backups
    const localResult = await this.rotateLocalBackups();

    // Rotate S3 backups
    const s3Result = await this.rotateS3Backups();

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ROTATION COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Local: ${localResult.kept} kept, ${localResult.deleted} deleted`);
    console.log(`💾 Space freed: ${this.formatBytes(localResult.freedSpace)}`);

    if (this.config.storage.s3?.enabled) {
      console.log(`☁️  S3: ${s3Result.kept} kept, ${s3Result.deleted} deleted`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// CLI execution
if (import.meta.main) {
  try {
    const config = loadBackupConfig();
    const manager = new BackupRotationManager(config);
    await manager.performRotation();
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

export { BackupRotationManager };
