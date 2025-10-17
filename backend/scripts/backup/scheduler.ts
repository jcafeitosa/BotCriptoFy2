#!/usr/bin/env bun
/**
 * Backup Scheduler
 * Automated scheduling for backups, rotation, and health checks
 */

import { CronJob } from 'cron';
import { loadBackupConfig } from './backup.config';
import { BackupManager } from './backup';
import { BackupRotationManager } from './rotate';
import { BackupVerificationManager } from './verify';

class BackupScheduler {
  private jobs: CronJob[] = [];

  /**
   * Schedule daily backup at 2 AM
   */
  scheduleDailyBackup(): void {
    const job = new CronJob(
      '0 2 * * *', // Every day at 2:00 AM
      async () => {
        console.log('\n⏰ Daily backup triggered by scheduler');
        try {
          const config = loadBackupConfig();
          const manager = new BackupManager(config);
          await manager.performBackup('daily');
        } catch (error: any) {
          console.error('❌ Scheduled daily backup failed:', error.message);
        }
      },
      null,
      true,
      'America/Sao_Paulo'
    );

    this.jobs.push(job);
    console.log('✅ Scheduled daily backup at 2:00 AM');
  }

  /**
   * Schedule weekly backup on Sundays at 3 AM
   */
  scheduleWeeklyBackup(): void {
    const job = new CronJob(
      '0 3 * * 0', // Every Sunday at 3:00 AM
      async () => {
        console.log('\n⏰ Weekly backup triggered by scheduler');
        try {
          const config = loadBackupConfig();
          const manager = new BackupManager(config);
          await manager.performBackup('weekly');
        } catch (error: any) {
          console.error('❌ Scheduled weekly backup failed:', error.message);
        }
      },
      null,
      true,
      'America/Sao_Paulo'
    );

    this.jobs.push(job);
    console.log('✅ Scheduled weekly backup on Sundays at 3:00 AM');
  }

  /**
   * Schedule monthly backup on the 1st at 4 AM
   */
  scheduleMonthlyBackup(): void {
    const job = new CronJob(
      '0 4 1 * *', // 1st of every month at 4:00 AM
      async () => {
        console.log('\n⏰ Monthly backup triggered by scheduler');
        try {
          const config = loadBackupConfig();
          const manager = new BackupManager(config);
          await manager.performBackup('monthly');
        } catch (error: any) {
          console.error('❌ Scheduled monthly backup failed:', error.message);
        }
      },
      null,
      true,
      'America/Sao_Paulo'
    );

    this.jobs.push(job);
    console.log('✅ Scheduled monthly backup on 1st at 4:00 AM');
  }

  /**
   * Schedule backup rotation daily at 5 AM
   */
  scheduleRotation(): void {
    const job = new CronJob(
      '0 5 * * *', // Every day at 5:00 AM
      async () => {
        console.log('\n⏰ Backup rotation triggered by scheduler');
        try {
          const config = loadBackupConfig();
          const manager = new BackupRotationManager(config);
          await manager.performRotation();
        } catch (error: any) {
          console.error('❌ Scheduled rotation failed:', error.message);
        }
      },
      null,
      true,
      'America/Sao_Paulo'
    );

    this.jobs.push(job);
    console.log('✅ Scheduled backup rotation daily at 5:00 AM');
  }

  /**
   * Schedule health check every hour
   */
  scheduleHealthCheck(): void {
    const job = new CronJob(
      '0 * * * *', // Every hour at minute 0
      async () => {
        console.log('\n⏰ Health check triggered by scheduler');
        try {
          const config = loadBackupConfig();
          const manager = new BackupVerificationManager(config);
          const result = await manager.performHealthCheck();

          if (!result.healthy) {
            console.error('⚠️  Backup system health check failed!');
          }
        } catch (error: any) {
          console.error('❌ Scheduled health check failed:', error.message);
        }
      },
      null,
      true,
      'America/Sao_Paulo'
    );

    this.jobs.push(job);
    console.log('✅ Scheduled health check every hour');
  }

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Backup Scheduler');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`⏰ Timezone: America/Sao_Paulo`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.scheduleDailyBackup();
    this.scheduleWeeklyBackup();
    this.scheduleMonthlyBackup();
    this.scheduleRotation();
    this.scheduleHealthCheck();

    console.log(`\n✅ All ${this.jobs.length} jobs started successfully`);
    console.log('📊 Scheduler is now running...\n');

    // Print next execution times
    console.log('📅 Next scheduled executions:');
    this.jobs.forEach((job, index) => {
      const nextRun = job.nextDate();
      if (nextRun) {
        console.log(`   ${index + 1}. ${nextRun.toISO()}`);
      }
    });

    console.log('\n💡 Press Ctrl+C to stop the scheduler\n');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log('\n🛑 Stopping all scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    console.log('✅ All jobs stopped');
  }
}

// CLI execution
if (import.meta.main) {
  const scheduler = new BackupScheduler();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Received SIGINT signal');
    scheduler.stopAll();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Received SIGTERM signal');
    scheduler.stopAll();
    process.exit(0);
  });

  try {
    scheduler.startAll();

    // Keep process alive
    setInterval(() => {
      // Heartbeat
    }, 60000);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

export { BackupScheduler };
