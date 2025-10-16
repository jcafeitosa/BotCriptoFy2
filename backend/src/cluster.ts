/**
 * Cluster Manager for Multi-Core Performance
 * Spawns multiple Bun processes to utilize all available CPU cores
 *
 * Performance: ~1.5x faster than single process
 *
 * Usage:
 *   bun src/cluster.ts
 */

import { spawn } from 'bun';
import logger from './utils/logger';

// Get number of CPU cores
const cpus = navigator.hardwareConcurrency;
const workers: ReturnType<typeof spawn>[] = [];

// Determine number of workers (default: all CPUs)
const WORKER_COUNT = process.env.CLUSTER_WORKERS
  ? parseInt(process.env.CLUSTER_WORKERS, 10)
  : cpus;

logger.info('Starting cluster manager', {
  source: 'cluster',
  cpus,
  workers: WORKER_COUNT,
  platform: process.platform,
});

// macOS/Windows limitation warning
if (process.platform === 'darwin' || process.platform === 'win32') {
  logger.warn(
    'reusePort is not supported on macOS/Windows. For development, clustering will spawn multiple processes but load balancing may be limited.',
    { source: 'cluster', platform: process.platform }
  );
}

/**
 * Spawn worker processes
 */
function spawnWorkers(): void {
  for (let i = 0; i < WORKER_COUNT; i++) {
    const worker = spawn({
      cmd: ['bun', 'src/index.ts'],
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        WORKER_ID: String(i + 1),
        WORKER_COUNT: String(WORKER_COUNT),
        // Assign different ports for macOS/Windows (no reusePort)
        ...(process.platform === 'darwin' || process.platform === 'win32'
          ? { PORT: String(3000 + i) }
          : {}),
      },
    });

    workers.push(worker);

    logger.info(`Worker ${i + 1}/${WORKER_COUNT} started`, {
      source: 'cluster',
      workerId: i + 1,
      pid: worker.pid,
    });
  }
}

/**
 * Graceful shutdown of all workers
 */
async function shutdown(signal: string): Promise<void> {
  logger.warn(`Cluster shutdown initiated (${signal})`, {
    source: 'cluster',
    workers: workers.length,
  });

  // Kill all workers
  for (const worker of workers) {
    try {
      worker.kill();
      logger.info('Worker terminated', {
        source: 'cluster',
        pid: worker.pid,
      });
    } catch (error) {
      logger.error('Error killing worker', {
        source: 'cluster',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('All workers terminated', { source: 'cluster' });
  process.exit(0);
}

/**
 * Handle worker crashes and respawn
 */
function setupWorkerMonitoring(): void {
  workers.forEach((worker, index) => {
    worker.exited.then((exitCode) => {
      logger.error(`Worker ${index + 1} crashed with exit code ${exitCode}`, {
        source: 'cluster',
        workerId: index + 1,
        exitCode,
      });

      // Respawn crashed worker
      logger.info(`Respawning worker ${index + 1}...`, {
        source: 'cluster',
        workerId: index + 1,
      });

      workers[index] = spawn({
        cmd: ['bun', 'src/index.ts'],
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...process.env,
          WORKER_ID: String(index + 1),
          WORKER_COUNT: String(WORKER_COUNT),
          ...(process.platform === 'darwin' || process.platform === 'win32'
            ? { PORT: String(3000 + index) }
            : {}),
        },
      });

      logger.info(`Worker ${index + 1} respawned`, {
        source: 'cluster',
        workerId: index + 1,
        pid: workers[index]?.pid,
      });
    });
  });
}

// Start cluster
spawnWorkers();
setupWorkerMonitoring();

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Keep process alive
process.on('beforeExit', (code) => {
  if (code === 0) {
    logger.info('Cluster manager exiting', { source: 'cluster', code });
  }
});

logger.info('Cluster manager ready', {
  source: 'cluster',
  workers: WORKER_COUNT,
  cpus,
});

// Display cluster info
if (process.platform === 'darwin' || process.platform === 'win32') {
  logger.info('Workers listening on:', {
    source: 'cluster',
    ports: Array.from({ length: WORKER_COUNT }, (_, i) => 3000 + i),
    note: 'Use a reverse proxy (nginx/caddy) for load balancing',
  });
} else {
  logger.info('Workers sharing port 3000 via SO_REUSEPORT', {
    source: 'cluster',
    workers: WORKER_COUNT,
  });
}
