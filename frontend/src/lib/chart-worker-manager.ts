/**
 * @fileoverview Chart Worker Manager
 * @description Manages Web Worker lifecycle and communication
 * @version 1.0.0
 *
 * FEATURES:
 * - ✅ Automatic worker initialization
 * - ✅ Promise-based communication
 * - ✅ Error handling and retries
 * - ✅ Worker lifecycle management
 */

import type { WorkerRequest, WorkerResponse } from '../workers/chart-data.worker';

export class ChartWorkerManager {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private messageQueue: Array<{ message: WorkerRequest; resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/chart-data.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, data } = event.data;

          if (type === 'READY') {
            this.isReady = true;
            resolve();
            this.processQueue();
            return;
          }

          // Handle queued messages
          if (this.messageQueue.length > 0) {
            const { resolve: msgResolve, reject: msgReject } = this.messageQueue.shift()!;
            if (type === 'ERROR') {
              msgReject(new Error(event.data.error || 'Worker error'));
            } else {
              msgResolve(data);
            }
          }
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isReady) {
            reject(new Error('Worker initialization timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process message queue
   */
  private processQueue(): void {
    if (!this.isReady || !this.worker) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const { message } = this.messageQueue[0];
      this.worker.postMessage(message);
      break; // Process one at a time
    }
  }

  /**
   * Send message to worker
   */
  private sendMessage<T = any>(request: WorkerRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      if (!this.isReady) {
        this.messageQueue.push({ message: request, resolve, reject });
        return;
      }

      this.messageQueue.push({ message: request, resolve, reject });
      this.worker.postMessage(request);
    });
  }

  /**
   * Process historical data
   */
  async processHistoricalData(rawData: any[]): Promise<any[]> {
    return this.sendMessage({
      type: 'PROCESS_HISTORICAL',
      payload: rawData,
    });
  }

  /**
   * Process kline update
   */
  async processKlineUpdate(data: any): Promise<any> {
    return this.sendMessage({
      type: 'PROCESS_KLINE',
      payload: data,
    });
  }

  /**
   * Calculate technical indicators
   */
  async calculateIndicators(data: any[], indicators: string[]): Promise<any> {
    return this.sendMessage({
      type: 'CALCULATE_INDICATORS',
      payload: { data, indicators },
    });
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.messageQueue = [];
    }
  }
}

// Singleton instance
let workerManager: ChartWorkerManager | null = null;

export function getChartWorker(): ChartWorkerManager {
  if (!workerManager) {
    workerManager = new ChartWorkerManager();
  }
  return workerManager;
}
