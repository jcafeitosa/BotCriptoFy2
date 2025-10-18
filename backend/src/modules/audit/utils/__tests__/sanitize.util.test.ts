import { describe, expect, test } from 'bun:test';
import { sanitizeAuditLogForResponse, clampLimit } from '../../utils/sanitize.util';

describe('sanitizeAuditLogForResponse', () => {
  test('masks IPv4 addresses and truncates UA; removes errorStack', () => {
    const log = {
      id: '1',
      timestamp: new Date(),
      eventType: 'auth.login',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      errorStack: 'Sensitive stack',
    } as any;

    const out = sanitizeAuditLogForResponse(log, { maskSensitive: true });
    expect(out.ipAddress).toBe('192.168.x.x');
    expect(out.userAgent).toBe('Mozilla/5.0');
    expect('errorStack' in out).toBe(false);
  });

  test('does not modify when maskSensitive=false', () => {
    const log = {
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent',
      errorStack: 'Keep me',
    } as any;
    const out = sanitizeAuditLogForResponse(log, { maskSensitive: false });
    expect(out.ipAddress).toBe('10.0.0.1');
    expect(out.userAgent).toBe('TestAgent');
    expect(out.errorStack).toBe('Keep me');
  });

  test('redacts common sensitive metadata keys', () => {
    const log = {
      metadata: {
        token: 'abc',
        apiKey: 'xyz',
        other: 'ok',
      },
    } as any;
    const out = sanitizeAuditLogForResponse(log, { maskSensitive: true });
    expect(out.metadata.token).toBe('[REDACTED]');
    expect(out.metadata.apiKey).toBe('[REDACTED]');
    expect(out.metadata.other).toBe('ok');
  });
});

describe('clampLimit', () => {
  test('applies defaults when invalid', () => {
    expect(clampLimit(undefined)).toBe(100);
    expect(clampLimit(0)).toBe(100);
  });

  test('caps at max', () => {
    expect(clampLimit(5000, 1000, 100)).toBe(1000);
  });
});

