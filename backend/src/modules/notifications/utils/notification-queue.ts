/**
 * Notification Queue
 * Production-ready implementation using BullMQ with Redis
 * Replaces in-memory queue with persistent, scalable queue system
 */

import logger from '@/utils/logger';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
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
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number | null; // BullMQ requires null
  };
  queue: {
    maxConcurrent: number;
    retryDelay: number;
    maxRetries: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

/**
 * BullMQ-based notification queue with Redis persistence
 */
class NotificationQueue {
  private queue?: Queue;
  private worker?: Worker;
  private queueEvents?: QueueEvents;
  private redis?: Redis;
  private config: QueueConfig;
  private isInitialized = false;
  private handlers: Map<NotificationType, (job: NotificationJob) => Promise<void>> = new Map();

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      redis: {
        host: config.redis?.host || process.env.REDIS_HOST || 'localhost',
        port: config.redis?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
        password: config.redis?.password || process.env.REDIS_PASSWORD,
        db: config.redis?.db || parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: null, // BullMQ requires this to be null
      },
      queue: {
        maxConcurrent: config.queue?.maxConcurrent || 10,
        retryDelay: config.queue?.retryDelay || 5000,
        maxRetries: config.queue?.maxRetries || 3,
        removeOnComplete: config.queue?.removeOnComplete ?? 100, // Keep last 100 completed jobs
        removeOnFail: config.queue?.removeOnFail ?? 1000, // Keep last 1000 failed jobs
      },
    };
  }

  /**
   * Initialize BullMQ queue and worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[QUEUE] Already initialized');
      return;
    }

    try {
      // Create Redis connection for BullMQ
      const connection = {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      };

      // Create queue
      this.queue = new Queue('notifications', {
        connection,
        defaultJobOptions: {
          attempts: this.config.queue.maxRetries,
          backoff: {
            type: 'exponential',
            delay: this.config.queue.retryDelay,
          },
          removeOnComplete: this.config.queue.removeOnComplete,
          removeOnFail: this.config.queue.removeOnFail,
        },
      });

      // Create worker
      this.worker = new Worker(
        'notifications',
        async (job) => {
          return await this.processJob(job.data as NotificationJob);
        },
        {
          connection,
          concurrency: this.config.queue.maxConcurrent,
        }
      );

      // Create queue events listener
      this.queueEvents = new QueueEvents('notifications', { connection });

      // Setup event listeners
      this.setupEventListeners();

      // Test Redis connection
      this.redis = new Redis(connection);
      await this.redis.ping();

      this.isInitialized = true;

      logger.info('[QUEUE] BullMQ notification queue initialized successfully', {
        redis: `${this.config.redis.host}:${this.config.redis.port}`,
        db: this.config.redis.db,
        concurrency: this.config.queue.maxConcurrent,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[QUEUE] Failed to initialize queue', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    if (!this.worker || !this.queueEvents) {
      return;
    }

    // Worker events
    this.worker.on('completed', (job) => {
      logger.info('[QUEUE] Job completed', {
        jobId: job.id,
        notificationId: (job.data as NotificationJob).notificationId,
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('[QUEUE] Job failed', {
        jobId: job?.id,
        notificationId: (job?.data as NotificationJob)?.notificationId,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      });
    });

    this.worker.on('error', (err) => {
      logger.error('[QUEUE] Worker error', { error: err.message });
    });

    // Queue events
    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn('[QUEUE] Job stalled', { jobId });
    });

    // Note: 'retrying' event not available in QueueEvents, use 'stalled' instead
    // this.queueEvents.on('retrying', ({ jobId, attemptsMade }) => {
    //   logger.warn('[QUEUE] Job retrying', { jobId, attemptsMade });
    // });
  }

  /**
   * Register a worker handler for a specific notification type
   */
  registerWorker(type: NotificationType, handler: (job: NotificationJob) => Promise<void>): void {
    this.handlers.set(type, handler);
    logger.info(`[QUEUE] Worker handler registered for type: ${type}`);
  }

  /**
   * Add job to queue
   */
  async add(job: Omit<NotificationJob, 'id' | 'attempts' | 'createdAt'>): Promise<string> {
    if (!this.queue || !this.isInitialized) {
      throw new Error('Queue not initialized. Call initialize() first.');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const fullJob: NotificationJob = {
      ...job,
      id: jobId,
      attempts: 0,
      createdAt: new Date(),
    };

    // Map priority to BullMQ priority (lower number = higher priority)
    const priorityMap: Record<NotificationPriority, number> = {
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4,
    };

    await this.queue.add(job.type, fullJob, {
      jobId,
      priority: priorityMap[job.priority],
    });

    logger.debug(`[QUEUE] Job added to queue`, {
      jobId,
      type: job.type,
      priority: job.priority,
    });

    return jobId;
  }

  /**
   * Process individual job
   */
  private async processJob(job: NotificationJob): Promise<void> {
    job.attempts++;

    logger.debug(`[QUEUE] Processing job`, {
      jobId: job.id,
      type: job.type,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
    });

    const handler = this.handlers.get(job.type);

    if (!handler) {
      throw new Error(`No handler registered for notification type: ${job.type}`);
    }

    // Execute handler
    await handler(job);

    logger.info(`[QUEUE] Job processed successfully`, {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    if (!this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
        isRunning: false,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
      isRunning: this.isInitialized,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(start = 0, end = 10) {
    if (!this.queue) {
      return [];
    }

    return await this.queue.getFailed(start, end);
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.retry();
    logger.info('[QUEUE] Job retried', { jobId });
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('[QUEUE] Job removed', { jobId });
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  async clean(grace: number = 24 * 3600 * 1000, limit = 1000): Promise<void> {
    if (!this.queue) {
      return;
    }

    const cleaned = await this.queue.clean(grace, limit, 'completed');
    const cleanedFailed = await this.queue.clean(grace, limit, 'failed');

    logger.info('[QUEUE] Cleaned old jobs', {
      completed: cleaned,
      failed: cleanedFailed,
    });
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    if (this.queue) {
      await this.queue.pause();
      logger.info('[QUEUE] Queue paused');
    }
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    if (this.queue) {
      await this.queue.resume();
      logger.info('[QUEUE] Queue resumed');
    }
  }

  /**
   * Stop processing (graceful shutdown)
   */
  async stop(): Promise<void> {
    logger.info('[QUEUE] Stopping notification queue...');

    try {
      // Close worker (waits for active jobs to complete)
      if (this.worker) {
        await this.worker.close();
        logger.info('[QUEUE] Worker closed');
      }

      // Close queue events
      if (this.queueEvents) {
        await this.queueEvents.close();
        logger.info('[QUEUE] Queue events closed');
      }

      // Close queue
      if (this.queue) {
        await this.queue.close();
        logger.info('[QUEUE] Queue closed');
      }

      // Close Redis connection
      if (this.redis) {
        this.redis.disconnect();
        logger.info('[QUEUE] Redis disconnected');
      }

      this.isInitialized = false;
      logger.info('[QUEUE] Notification queue stopped gracefully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[QUEUE] Error stopping queue', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Clear all jobs from queue (for testing only)
   */
  async clear(): Promise<void> {
    if (!this.queue) {
      return;
    }

    await this.queue.obliterate({ force: true });
    logger.warn('[QUEUE] All jobs cleared from queue');
  }
}

// Singleton instance
export const notificationQueue = new NotificationQueue();

/**
 * Initialize queue workers
 * This should be called at app startup
 */
export async function initializeQueueWorkers(): Promise<void> {
  logger.info('[QUEUE] Initializing notification queue workers...');

  try {
    await notificationQueue.initialize();
    logger.info('[QUEUE] Notification queue workers initialized');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[QUEUE] Failed to initialize queue workers', { error: errorMessage });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdownQueue(): Promise<void> {
  await notificationQueue.stop();
}
