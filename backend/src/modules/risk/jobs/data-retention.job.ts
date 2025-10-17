/**
 * Data Retention Cron Job
 * Runs daily at 2 AM to archive and clean up old risk metrics
 *
 * Schedule: 0 2 * * * (Every day at 2:00 AM)
 */

import { CronJob } from 'cron';
import { riskRetentionService, RETENTION_CONFIG } from '../services/risk-retention.service';
import { logInfo, logWarn, logError, logDebug } from '@/utils/logger';

/**
 * Data Retention Job
 * Archives metrics older than 90 days and deletes them from database
 */
export class DataRetentionJob {
  private job: CronJob | null = null;
  private isRunning = false;

  /**
   * Start the cron job
   */
  start(): void {
    if (this.job) {
      logWarn('Data retention job already started');
      return;
    }

    logInfo('🕐 Starting data retention cron job', {
      schedule: RETENTION_CONFIG.schedule,
      timezone: 'UTC',
      retentionDays: RETENTION_CONFIG.retentionDays,
    });

    this.job = new CronJob(
      RETENTION_CONFIG.schedule,
      async () => await this.execute(),
      null, // onComplete
      true, // start immediately
      'UTC' // timezone
    );

    logInfo('✅ Data retention job started successfully');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (!this.job) {
      logWarn('Data retention job not running');
      return;
    }

    this.job.stop();
    this.job = null;
    logInfo('⏹️  Data retention job stopped');
  }

  /**
   * Execute the retention process
   */
  async execute(): Promise<void> {
    if (this.isRunning) {
      logWarn('⏭️  Skipping data retention - previous job still running');
      return;
    }

    this.isRunning = true;

    try {
      logInfo('🚀 Executing data retention job...');

      // Get current stats before archival
      const statsBefore = await riskRetentionService.getRetentionStats();
      logInfo('📊 Pre-archival statistics', statsBefore);

      // Run archival process
      const archiveStats = await riskRetentionService.archiveOldMetrics(false);

      // Get stats after archival
      const statsAfter = await riskRetentionService.getRetentionStats();
      logInfo('📊 Post-archival statistics', statsAfter);

      // Log results
      if (archiveStats.errors.length > 0) {
        logWarn('⚠️  Data retention completed with errors', {
          stats: archiveStats,
          errorCount: archiveStats.errors.length,
          errors: archiveStats.errors,
        });
      } else {
        logInfo('✅ Data retention completed successfully', {
          stats: archiveStats,
        });
      }

      // Send metrics/alerts if configured
      await this.sendMetrics(archiveStats, statsBefore, statsAfter);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, {
        message: '❌ Data retention job failed',
      });

      // TODO: Send alert to monitoring system
      // await this.sendAlert(err);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send metrics to monitoring system
   */
  private async sendMetrics(
    archiveStats: any,
    statsBefore: any,
    statsAfter: any
  ): Promise<void> {
    // TODO: Implement metrics reporting (Prometheus, CloudWatch, etc.)
    logDebug('📈 Metrics', {
      archived: archiveStats.recordsArchived,
      deleted: archiveStats.recordsDeleted,
      duration: archiveStats.duration,
      bytesArchived: archiveStats.bytesArchived,
      recordsBefore: statsBefore.totalRecords,
      recordsAfter: statsAfter.totalRecords,
      spaceSaved: statsBefore.totalRecords - statsAfter.totalRecords,
    });
  }

  /**
   * Run job manually (for testing)
   */
  async runManually(dryRun = false): Promise<void> {
    logInfo('🔧 Running data retention manually', { dryRun });

    const stats = await riskRetentionService.archiveOldMetrics(dryRun);

    logInfo('✅ Manual run completed', { stats });
  }

  /**
   * Get job status
   */
  getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
    nextRun: Date | null;
    lastRun: Date | null;
  } {
    return {
      isScheduled: this.job !== null,
      isRunning: this.isRunning,
      nextRun: this.job ? (this.job.nextDate() as any).toJSDate() : null,
      lastRun: this.job && this.job.lastDate() ? (this.job.lastDate() as any).toJSDate() : null,
    };
  }
}

// Export singleton instance
export const dataRetentionJob = new DataRetentionJob();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  dataRetentionJob.start();
  logInfo('✅ Data retention job auto-started in production mode');
}
