/**
 * Notification Queue
 * Manages async notification delivery using in-memory queue
 * TODO: Replace with Redis/BullMQ for production
 */

import logger from '@/utils/logger';
import type { NotificationType, NotificationPriority } from '../types/notification.types';

/**
 * Queue job interface
 */
export interface NotificationJob {
  id: string;
  notificationId: string;
  type: NotificationType;
  priority: NotificationPriority;
  data: {
    userId: string;
    tenantId: string;
    subject?: string;
    content: string;
    metadata?: Record<string, any>;
  };
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  createdAt: Date;
}

/**
 * Queue configuration
 */
interface QueueConfig {
  maxConcurrent: number;
  retryDelay: number; // milliseconds
  maxRetries: number;
}

/**
 * In-memory notification queue
 * TODO: Replace with Redis Queue (BullMQ) for production use
 */
class NotificationQueue {
  private queue: NotificationJob[] = [];
  private processing: Map<string, NotificationJob> = new Map();
  private workers: Map<string, (job: NotificationJob) => Promise<void>> = new Map();
  private config: QueueConfig;
  private isRunning = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 10,
      retryDelay: config.retryDelay || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Register a worker for a specific notification type
   */
  registerWorker(type: NotificationType, handler: (job: NotificationJob) => Promise<void>) {
    this.workers.set(type, handler);
    logger.info(`Notification worker registered for type: ${type}`);
  }

  /**
   * Add job to queue
   */
  async add(job: Omit<NotificationJob, 'id' | 'attempts' | 'createdAt'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const fullJob: NotificationJob = {
      ...job,
      id: jobId,
      attempts: 0,
      createdAt: new Date(),
    };

    // Insert based on priority (high priority first)
    const priorityOrder: NotificationPriority[] = ['urgent', 'high', 'normal', 'low'];
    const jobPriorityIndex = priorityOrder.indexOf(fullJob.priority);

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuedPriorityIndex = priorityOrder.indexOf(this.queue[i].priority);
      if (jobPriorityIndex < queuedPriorityIndex) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, fullJob);

    logger.debug(`Job added to notification queue: ${jobId}`, {
      type: job.type,
      priority: job.priority,
      queueSize: this.queue.length,
    });

    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Start processing queue
   */
  private async startProcessing() {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Notification queue processing started');

    while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
      // Check if we can process more jobs
      if (this.processing.size < this.config.maxConcurrent && this.queue.length > 0) {
        const job = this.queue.shift();
        if (job) {
          this.processJob(job);
        }
      }

      // Wait a bit before next iteration
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isRunning = false;
    logger.info('Notification queue processing stopped');
  }

  /**
   * Process individual job
   */
  private async processJob(job: NotificationJob) {
    this.processing.set(job.id, job);
    job.attempts++;

    logger.debug(`Processing notification job: ${job.id}`, {
      type: job.type,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
    });

    try {
      const worker = this.workers.get(job.type);

      if (!worker) {
        throw new Error(`No worker registered for notification type: ${job.type}`);
      }

      // Execute worker
      await worker(job);

      // Job completed successfully
      this.processing.delete(job.id);

      logger.info(`Notification job completed: ${job.id}`, {
        type: job.type,
        attempts: job.attempts,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Notification job failed: ${job.id}`, {
        type: job.type,
        attempt: job.attempts,
        error: errorMessage,
      });

      // Retry logic
      if (job.attempts < job.maxAttempts) {
        // Calculate exponential backoff
        const backoffDelay = this.config.retryDelay * Math.pow(2, job.attempts - 1);

        job.nextRetryAt = new Date(Date.now() + backoffDelay);

        logger.warn(`Scheduling retry for job: ${job.id}`, {
          nextRetry: job.nextRetryAt.toISOString(),
          attempt: job.attempts + 1,
          maxAttempts: job.maxAttempts,
        });

        // Remove from processing and add back to queue after delay
        this.processing.delete(job.id);

        setTimeout(() => {
          this.queue.push(job);
        }, backoffDelay);
      } else {
        // Max retries exceeded
        this.processing.delete(job.id);

        logger.error(`Job failed after max retries: ${job.id}`, {
          type: job.type,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
        });

        // TODO: Move to dead letter queue or mark notification as permanently failed
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size,
      isRunning: this.isRunning,
    };
  }

  /**
   * Stop processing (graceful shutdown)
   */
  async stop() {
    logger.info('Stopping notification queue...');
    this.isRunning = false;

    // Wait for current jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.processing.size > 0 && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.processing.size > 0) {
      logger.warn(`Force stopped with ${this.processing.size} jobs still processing`);
    } else {
      logger.info('Notification queue stopped gracefully');
    }
  }

  /**
   * Clear queue (for testing)
   */
  clear() {
    this.queue = [];
    this.processing.clear();
    logger.warn('Notification queue cleared');
  }
}

// Singleton instance
export const notificationQueue = new NotificationQueue({
  maxConcurrent: 10,
  retryDelay: 5000,
  maxRetries: 3,
});

/**
 * Initialize queue workers
 * This should be called at app startup
 */
export function initializeQueueWorkers() {
  logger.info('Initializing notification queue workers...');

  // Workers will be registered by channel providers when they're loaded
  // For now, just log that initialization is ready

  logger.info('Notification queue workers initialized');
}

/**
 * Graceful shutdown handler
 */
export async function shutdownQueue() {
  await notificationQueue.stop();
}
