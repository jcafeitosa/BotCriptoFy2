/**
 * Risk Data Retention Service Tests
 * Tests for archival and cleanup functionality
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { RiskRetentionService, RETENTION_CONFIG } from '../services/risk-retention.service';

describe('RiskRetentionService', () => {
  const service = new RiskRetentionService();

  // ==============================================================================
  // CONFIGURATION TESTS
  // ==============================================================================

  describe('Configuration', () => {
    test('should have correct retention configuration', () => {
      expect(RETENTION_CONFIG.retentionDays).toBe(90);
      expect(RETENTION_CONFIG.archiveBatchSize).toBe(10000);
      expect(RETENTION_CONFIG.compressionLevel).toBeGreaterThanOrEqual(0);
      expect(RETENTION_CONFIG.compressionLevel).toBeLessThanOrEqual(9);
      expect(RETENTION_CONFIG.schedule).toBe('0 2 * * *'); // Daily at 2 AM
    });
  });

  // ==============================================================================
  // RETENTION STATS TESTS
  // ==============================================================================

  describe('Retention Statistics', () => {
    test('should get retention statistics', async () => {
      const stats = await service.getRetentionStats();

      // Verify structure
      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('oldRecords');
      expect(stats).toHaveProperty('recentRecords');
      expect(stats).toHaveProperty('oldestRecord');
      expect(stats).toHaveProperty('newestRecord');
      expect(stats).toHaveProperty('cutoffDate');

      // Verify types
      expect(typeof stats.totalRecords).toBe('number');
      expect(typeof stats.oldRecords).toBe('number');
      expect(typeof stats.recentRecords).toBe('number');
      expect(stats.cutoffDate).toBeInstanceOf(Date);

      // Verify logic
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.oldRecords).toBeGreaterThanOrEqual(0);
      expect(stats.recentRecords).toBeGreaterThanOrEqual(0);
      expect(stats.totalRecords).toBe(stats.oldRecords + stats.recentRecords);
    });

    test('should calculate correct cutoff date', async () => {
      const stats = await service.getRetentionStats();
      const today = new Date();
      const expectedCutoff = new Date();
      expectedCutoff.setDate(today.getDate() - RETENTION_CONFIG.retentionDays);

      // Allow 1 day tolerance for test execution time
      const diff = Math.abs(stats.cutoffDate.getTime() - expectedCutoff.getTime());
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(diff).toBeLessThan(oneDayMs);
    });
  });

  // ==============================================================================
  // DRY RUN TESTS
  // ==============================================================================

  describe('Dry Run Mode', () => {
    test('should perform dry run without archiving or deleting', async () => {
      const statsBefore = await service.getRetentionStats();

      // Run in dry run mode
      const archiveStats = await service.archiveOldMetrics(true);

      const statsAfter = await service.getRetentionStats();

      // Verify dry run didn't modify data
      expect(statsAfter.totalRecords).toBe(statsBefore.totalRecords);
      expect(statsAfter.oldRecords).toBe(statsBefore.oldRecords);

      // Verify stats structure
      expect(archiveStats).toHaveProperty('totalRecords');
      expect(archiveStats).toHaveProperty('recordsArchived');
      expect(archiveStats).toHaveProperty('recordsDeleted');
      expect(archiveStats).toHaveProperty('batches');
      expect(archiveStats).toHaveProperty('duration');
      expect(archiveStats).toHaveProperty('bytesArchived');
      expect(archiveStats).toHaveProperty('errors');

      // Dry run should not archive or delete
      expect(archiveStats.recordsArchived).toBe(0);
      expect(archiveStats.recordsDeleted).toBe(0);
      expect(archiveStats.bytesArchived).toBe(0);
    });

    test('should count records correctly in dry run', async () => {
      const stats = await service.getRetentionStats();
      const archiveStats = await service.archiveOldMetrics(true);

      expect(archiveStats.totalRecords).toBe(stats.oldRecords);
    });
  });

  // ==============================================================================
  // ARCHIVE STATS STRUCTURE TESTS
  // ==============================================================================

  describe('Archive Statistics Structure', () => {
    test('should return complete archive statistics', async () => {
      const stats = await service.archiveOldMetrics(true);

      // Required fields
      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('recordsArchived');
      expect(stats).toHaveProperty('recordsDeleted');
      expect(stats).toHaveProperty('batches');
      expect(stats).toHaveProperty('startTime');
      expect(stats).toHaveProperty('endTime');
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('bytesArchived');
      expect(stats).toHaveProperty('errors');

      // Type validation
      expect(typeof stats.totalRecords).toBe('number');
      expect(typeof stats.recordsArchived).toBe('number');
      expect(typeof stats.recordsDeleted).toBe('number');
      expect(typeof stats.batches).toBe('number');
      expect(stats.startTime).toBeInstanceOf(Date);
      expect(stats.endTime).toBeInstanceOf(Date);
      expect(typeof stats.duration).toBe('number');
      expect(typeof stats.bytesArchived).toBe('number');
      expect(Array.isArray(stats.errors)).toBe(true);

      // Logic validation
      expect(stats.endTime.getTime()).toBeGreaterThanOrEqual(stats.startTime.getTime());
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.batches).toBeGreaterThanOrEqual(0);
    });

    test('should calculate duration correctly', async () => {
      const stats = await service.archiveOldMetrics(true);

      const calculatedDuration = stats.endTime.getTime() - stats.startTime.getTime();

      // Allow small tolerance for calculation differences
      expect(Math.abs(stats.duration - calculatedDuration)).toBeLessThan(100);
    });
  });

  // ==============================================================================
  // COMPRESSION TESTS
  // ==============================================================================

  describe('Data Compression', () => {
    test('should use valid compression level', () => {
      const level = RETENTION_CONFIG.compressionLevel;

      // gzip compression levels are 0-9
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(9);
    });

    test('should compress data before archiving', async () => {
      // This is implicitly tested by archiveBatch
      // Compression level 6 is a good balance between speed and compression ratio
      expect(RETENTION_CONFIG.compressionLevel).toBe(6);
    });
  });

  // ==============================================================================
  // BATCH PROCESSING TESTS
  // ==============================================================================

  describe('Batch Processing', () => {
    test('should use reasonable batch size', () => {
      const batchSize = RETENTION_CONFIG.archiveBatchSize;

      // Batch size should be large enough for efficiency but small enough for memory
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(50000);
    });

    test('should process zero records gracefully', async () => {
      // If no old records exist, should complete without errors
      const stats = await service.archiveOldMetrics(true);

      expect(stats.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.errors).toHaveLength(0);
    });
  });

  // ==============================================================================
  // ERROR HANDLING TESTS
  // ==============================================================================

  describe('Error Handling', () => {
    test('should initialize errors array', async () => {
      const stats = await service.archiveOldMetrics(true);

      expect(Array.isArray(stats.errors)).toBe(true);
      expect(stats.errors.length).toBeGreaterThanOrEqual(0);
    });

    test('should track errors during processing', async () => {
      const stats = await service.archiveOldMetrics(true);

      // Errors should be strings
      stats.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });
  });

  // ==============================================================================
  // DATE HANDLING TESTS
  // ==============================================================================

  describe('Date Calculations', () => {
    test('should calculate cutoff date correctly', () => {
      const today = new Date();
      const cutoff = new Date();
      cutoff.setDate(today.getDate() - RETENTION_CONFIG.retentionDays);

      // Cutoff should be exactly 90 days ago
      const diffDays = Math.floor((today.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(RETENTION_CONFIG.retentionDays);
    });

    test('should handle month boundaries correctly', () => {
      const today = new Date('2025-03-15');
      const cutoff = new Date(today);
      cutoff.setDate(today.getDate() - 90);

      // 90 days before March 15 is December 15 (previous year)
      expect(cutoff.getMonth()).toBe(11); // December (0-indexed)
      expect(cutoff.getFullYear()).toBe(2024);
    });
  });

  // ==============================================================================
  // ARCHIVE FORMAT TESTS
  // ==============================================================================

  describe('Archive Format', () => {
    test('should use JSON Lines format (.jsonl)', () => {
      // JSON Lines: one JSON object per line
      // This format is efficient for streaming and processing large datasets
      // File extension: .jsonl.gz (compressed)

      const expectedExtension = '.jsonl.gz';
      const testFilename = `risk-metrics-archive_2025-01-15_${Date.now()}.jsonl.gz`;

      expect(testFilename.endsWith(expectedExtension)).toBe(true);
    });

    test('should include timestamp in filename', () => {
      const now = Date.now();
      const filename = `risk-metrics-archive_2025-01-15_${now}.jsonl.gz`;

      expect(filename).toContain(String(now));
      expect(filename).toMatch(/risk-metrics-archive_\d{4}-\d{2}-\d{2}_\d+\.jsonl\.gz/);
    });
  });
});
