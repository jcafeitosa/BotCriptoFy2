/**
 * Risk Data Retention Service
 * Manages archival and cleanup of old risk metrics data
 *
 * Policy:
 * - Keep 90 days in PostgreSQL
 * - Archive to S3 before deletion
 * - Compress with gzip
 * - Run daily at 2 AM
 */

import { db } from '@/db';
import { riskMetrics } from '../schema/risk.schema';
import { lt, sql, and, eq } from 'drizzle-orm';
import { logInfo, logError, logWarn, logDebug } from '@/utils/logger';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * Data Retention Configuration
 */
export const RETENTION_CONFIG = {
  retentionDays: 90,
  archiveBatchSize: 10000, // Process in batches to avoid memory issues
  compressionLevel: 6, // gzip compression (0-9)
  schedule: '0 2 * * *', // Daily at 2 AM (cron format)
} as const;

/**
 * Archive Statistics
 */
export interface ArchiveStats {
  totalRecords: number;
  recordsArchived: number;
  recordsDeleted: number;
  batches: number;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  bytesArchived: number;
  errors: string[];
}

/**
 * Risk Retention Service
 * Handles data archival and cleanup
 */
export class RiskRetentionService {
  /**
   * Archive and delete old risk metrics
   * @param dryRun - If true, only count records without archiving/deleting
   * @returns Archive statistics
   */
  async archiveOldMetrics(dryRun = false): Promise<ArchiveStats> {
    const startTime = new Date();
    const stats: ArchiveStats = {
      totalRecords: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      batches: 0,
      startTime,
      endTime: new Date(),
      duration: 0,
      bytesArchived: 0,
      errors: [],
    };

    try {
      logInfo('📦 Starting data retention process...', {
        dryRun,
        retentionDays: RETENTION_CONFIG.retentionDays,
      });

      // Calculate cutoff date (90 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.retentionDays);

      // Count total records to archive
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(riskMetrics)
        .where(lt(riskMetrics.calculatedAt, cutoffDate));

      stats.totalRecords = Number(countResult[0]?.count || 0);

      if (stats.totalRecords === 0) {
        logInfo('✅ No records to archive');
        stats.endTime = new Date();
        stats.duration = stats.endTime.getTime() - startTime.getTime();
        return stats;
      }

      logInfo(`📊 Found ${stats.totalRecords} records to archive`, {
        cutoffDate: cutoffDate.toISOString(),
      });

      if (dryRun) {
        logInfo('🏃 Dry run - skipping archive and delete operations');
        stats.endTime = new Date();
        stats.duration = stats.endTime.getTime() - startTime.getTime();
        return stats;
      }

      // Process in batches
      let offset = 0;
      while (offset < stats.totalRecords) {
        try {
          stats.batches++;
          logInfo(`📦 Processing batch ${stats.batches}...`, {
            offset,
            batchSize: RETENTION_CONFIG.archiveBatchSize,
          });

          // Fetch batch of old records
          const batch = await db
            .select()
            .from(riskMetrics)
            .where(lt(riskMetrics.calculatedAt, cutoffDate))
            .limit(RETENTION_CONFIG.archiveBatchSize)
            .offset(offset);

          if (batch.length === 0) break;

          // Archive to S3 (or file system if S3 not configured)
          const archiveResult = await this.archiveBatch(batch, cutoffDate);
          stats.bytesArchived += archiveResult.bytes;
          stats.recordsArchived += batch.length;

          // Delete archived records from database
          const idsToDelete = batch.map(r => r.id);
          await this.deleteBatch(idsToDelete);
          stats.recordsDeleted += batch.length;

          logInfo(`✅ Batch ${stats.batches} completed`, {
            archived: batch.length,
            totalArchived: stats.recordsArchived,
            totalDeleted: stats.recordsDeleted,
          });

          offset += RETENTION_CONFIG.archiveBatchSize;
        } catch (error) {
          const errorMsg = `Batch ${stats.batches} failed: ${error instanceof Error ? error.message : String(error)}`;
          const err = error instanceof Error ? error : new Error(errorMsg);
          logError(err, { batch: stats.batches });
          stats.errors.push(errorMsg);

          // Continue with next batch even if one fails
          offset += RETENTION_CONFIG.archiveBatchSize;
        }
      }

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();

      logInfo('✅ Data retention process completed', {
        totalRecords: stats.totalRecords,
        recordsArchived: stats.recordsArchived,
        recordsDeleted: stats.recordsDeleted,
        batches: stats.batches,
        duration: `${(stats.duration / 1000).toFixed(2)}s`,
        bytesArchived: `${(stats.bytesArchived / 1024 / 1024).toFixed(2)} MB`,
        errors: stats.errors.length,
      });

      return stats;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { message: '❌ Data retention process failed' });
      stats.errors.push(`Fatal error: ${err.message}`);
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();
      throw error;
    }
  }

  /**
   * Archive a batch of records to storage
   * @param batch - Records to archive
   * @param cutoffDate - Cutoff date for filename
   * @returns Archive result with byte count
   */
  private async archiveBatch(
    batch: any[],
    cutoffDate: Date
  ): Promise<{ bytes: number }> {
    try {
      // Create JSON Lines format (one JSON object per line)
      const jsonLines = batch.map(record => JSON.stringify(record)).join('\n');
      const buffer = Buffer.from(jsonLines, 'utf-8');

      // Compress with gzip
      const compressed = await this.compressData(buffer);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `risk-metrics-archive_${timestamp}_${Date.now()}.jsonl.gz`;

      // Save to storage (file system for now, S3 later)
      await this.saveToStorage(filename, compressed);

      return { bytes: compressed.length };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to archive batch');
      logError(err);
      throw error;
    }
  }

  /**
   * Compress data with gzip
   */
  private async compressData(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gzip = createGzip({ level: RETENTION_CONFIG.compressionLevel });

      gzip.on('data', (chunk) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);

      gzip.write(buffer);
      gzip.end();
    });
  }

  /**
   * Save compressed data to storage
   * TODO: Implement S3 upload when configured
   */
  private async saveToStorage(filename: string, data: Buffer): Promise<void> {
    const archivePath = process.env.RISK_ARCHIVE_PATH || './data/archives';

    // Ensure directory exists
    const fs = await import('fs/promises');
    await fs.mkdir(archivePath, { recursive: true });

    // Write file
    const fullPath = `${archivePath}/${filename}`;
    await fs.writeFile(fullPath, data);

    logInfo('📁 Archive saved', {
      filename,
      path: fullPath,
      size: `${(data.length / 1024).toFixed(2)} KB`,
    });

    // TODO: Upload to S3 if configured
    // if (process.env.AWS_S3_BUCKET) {
    //   await this.uploadToS3(filename, data);
    // }
  }

  /**
   * Delete a batch of records by IDs
   */
  private async deleteBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .delete(riskMetrics)
      .where(sql`${riskMetrics.id} = ANY(${ids})`);

    logDebug(`🗑️  Deleted ${ids.length} records from database`);
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<{
    totalRecords: number;
    oldRecords: number;
    recentRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    cutoffDate: Date;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.retentionDays);

    const [totalResult, oldResult, recentResult, oldestResult, newestResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(riskMetrics),
      db.select({ count: sql<number>`count(*)` }).from(riskMetrics).where(lt(riskMetrics.calculatedAt, cutoffDate)),
      db.select({ count: sql<number>`count(*)` }).from(riskMetrics).where(sql`${riskMetrics.calculatedAt} >= ${cutoffDate}`),
      db.select({ oldest: sql<Date>`min(${riskMetrics.calculatedAt})` }).from(riskMetrics),
      db.select({ newest: sql<Date>`max(${riskMetrics.calculatedAt})` }).from(riskMetrics),
    ]);

    return {
      totalRecords: Number(totalResult[0]?.count || 0),
      oldRecords: Number(oldResult[0]?.count || 0),
      recentRecords: Number(recentResult[0]?.count || 0),
      oldestRecord: oldestResult[0]?.oldest || null,
      newestRecord: newestResult[0]?.newest || null,
      cutoffDate,
    };
  }
}

// Export singleton instance
export const riskRetentionService = new RiskRetentionService();
