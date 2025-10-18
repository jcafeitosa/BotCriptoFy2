/**
 * Audit log response sanitization utilities
 * Ensures sensitive fields are masked unless explicitly allowed.
 */

type AnyRecord = Record<string, any>;

function maskIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  // Basic mask: keep first two octets for IPv4; for others, truncate
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.x.x`;
  return ip.substring(0, Math.min(8, ip.length)) + '…';
}

function maskUserAgent(ua?: string | null): string | undefined {
  if (!ua) return undefined;
  // Keep product name only (before first parenthesis)
  const idx = ua.indexOf('(');
  return idx > 0 ? ua.slice(0, idx).trim() : ua.slice(0, 32);
}

/**
 * Sanitize a single audit log entry for API response
 */
export function sanitizeAuditLogForResponse<T extends AnyRecord>(
  log: T,
  options: { maskSensitive: boolean }
): T {
  if (!options.maskSensitive) return log;

  const clone = { ...(log as AnyRecord) };

  if ('ipAddress' in clone) clone.ipAddress = maskIp(clone.ipAddress);
  if ('userAgent' in clone) clone.userAgent = maskUserAgent(clone.userAgent);
  if ('errorStack' in clone) delete clone.errorStack; // avoid leaking stack traces

  // Avoid overly large metadata payloads
  if (clone.metadata && typeof clone.metadata === 'object') {
    const meta = clone.metadata as AnyRecord;
    // Redact common sensitive keys
    const SENSITIVE_KEYS = ['token', 'password', 'secret', 'apiKey', 'privateKey'];
    for (const key of Object.keys(meta)) {
      if (SENSITIVE_KEYS.includes(key)) meta[key] = '[REDACTED]';
    }

    // Shallow clamp size by stringifying and truncating if too large
    const serialized = JSON.stringify(meta);
    if (serialized.length > 10_000) {
      clone.metadata = { note: 'metadata truncated for size' } as AnyRecord;
    }
  }

  return clone as T;
}

/** Clamp a requested limit to a safe maximum */
export function clampLimit(limit?: number, max = 1000, def = 100): number {
  if (!limit || Number.isNaN(limit) || limit < 1) return def;
  return Math.min(limit, max);
}

