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

      // Send alert to monitoring system
      await this.sendAlert(err);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send metrics to monitoring system
   * Implements metrics reporting compatible with Prometheus, CloudWatch, etc.
   */
  private async sendMetrics(
    archiveStats: any,
    statsBefore: any,
    statsAfter: any
  ): Promise<void> {
    const metrics = {
      // Archive metrics
      risk_archival_records_archived_total: archiveStats.recordsArchived,
      risk_archival_records_deleted_total: archiveStats.recordsDeleted,
      risk_archival_duration_ms: archiveStats.duration,
      risk_archival_bytes_archived_total: archiveStats.bytesArchived,
      risk_archival_batches_total: archiveStats.batches,
      risk_archival_errors_total: archiveStats.errors.length,

      // Retention metrics
      risk_retention_records_before: statsBefore.totalRecords,
      risk_retention_records_after: statsAfter.totalRecords,
      risk_retention_space_saved: statsBefore.totalRecords - statsAfter.totalRecords,
      risk_retention_old_records: statsBefore.oldRecords,
      risk_retention_recent_records: statsAfter.recentRecords,

      // Timestamp
      risk_archival_last_run_timestamp: Date.now(),
    };

    logDebug('📈 Metrics collected', metrics);

    // Export metrics in Prometheus format (can be scraped by Prometheus)
    if (process.env.METRICS_ENABLED === 'true') {
      this.exportPrometheusMetrics(metrics);
    }

    // Send to CloudWatch if configured
    if (process.env.AWS_CLOUDWATCH_ENABLED === 'true') {
      await this.sendToCloudWatch(metrics);
    }

    // Log metrics for structured logging systems (Datadog, New Relic, etc.)
    logInfo('📊 Data retention metrics', metrics);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusMetrics(metrics: Record<string, number>): void {
    // Prometheus format: metric_name value timestamp
    const prometheusMetrics = Object.entries(metrics)
      .map(([key, value]) => `${key} ${value} ${Date.now()}`)
      .join('\n');

    logDebug('Prometheus metrics', { metrics: prometheusMetrics });

    // In production, these would be exposed via /metrics endpoint
    // For now, log them for collection by log aggregation systems
  }

  /**
   * Send metrics to CloudWatch
   */
  private async sendToCloudWatch(metrics: Record<string, number>): Promise<void> {
    try {
      // CloudWatch SDK would be used here
      // For now, prepare the data structure
      const cloudWatchMetrics = Object.entries(metrics).map(([metricName, value]) => ({
        MetricName: metricName,
        Value: value,
        Unit: metricName.includes('bytes') ? 'Bytes' :
              metricName.includes('duration') ? 'Milliseconds' : 'Count',
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Service', Value: 'RiskManagement' },
          { Name: 'Operation', Value: 'DataRetention' },
        ],
      }));

      logDebug('CloudWatch metrics prepared', { count: cloudWatchMetrics.length });

      // When AWS SDK is available, uncomment:
      // const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
      // await cloudwatch.send(new PutMetricDataCommand({
      //   Namespace: 'BeeCripto/Risk',
      //   MetricData: cloudWatchMetrics,
      // }));

    } catch (error) {
      logWarn('Failed to send CloudWatch metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send alert on job failure
   */
  private async sendAlert(error: Error): Promise<void> {
    try {
      // Import notification service
      const { sendNotification } = await import('../../notifications/services/notification.service');

      // Get system admin user ID from environment or use 'system'
      const adminUserId = process.env.SYSTEM_ADMIN_USER_ID || 'system';
      const tenantId = process.env.DEFAULT_TENANT_ID || 'default';

      // Send notification to administrators
      await sendNotification({
        userId: adminUserId,
        tenantId,
        type: 'in_app',
        category: 'system',
        priority: 'urgent',
        subject: '🚨 Data Retention Job Failed',
        content: `The data retention job failed with error: ${error.message}\n\nStack trace:\n${error.stack}`,
        metadata: {
          service: 'risk',
          job: 'data-retention',
          errorMessage: error.message,
          errorStack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });

      logInfo('Alert sent to administrators', { error: error.message });
    } catch (alertError) {
      logWarn('Failed to send alert', {
        originalError: error.message,
        alertError: alertError instanceof Error ? alertError.message : String(alertError),
      });
    }
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
