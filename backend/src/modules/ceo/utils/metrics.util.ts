/**
 * CEO Metrics Utilities
 * Summaries derived from Prometheus metrics JSON
 */

export function summarizeHttpMetrics(metricsJSON: any[]): {
  avgResponseTimeMs: number;
  totalApiCalls: number;
  errorRatePercent: number;
} {
  const httpDurations = metricsJSON.find((m) => m.name === 'http_request_duration_seconds');
  const httpTotals = metricsJSON.find((m) => m.name === 'http_requests_total');

  let totalApiCalls = 0;
  let errorCalls = 0;
  if (httpTotals?.values) {
    for (const v of httpTotals.values) {
      const count = Number(v.value || 0);
      totalApiCalls += count;
      const status = (v.labels?.status || '').toString();
      const statusNum = parseInt(status, 10);
      if (!Number.isNaN(statusNum) && statusNum >= 500) errorCalls += count;
    }
  }
  const errorRatePercent = totalApiCalls > 0 ? +(100 * (errorCalls / totalApiCalls)).toFixed(2) : 0;

  let durationSum = 0;
  let durationCount = 0;
  if (httpDurations?.values) {
    for (const v of httpDurations.values) {
      if (v.metricNameSuffix === 'sum') durationSum += Number(v.value || 0);
      if (v.metricNameSuffix === 'count') durationCount += Number(v.value || 0);
    }
  }
  const avgResponseTimeMs = durationCount > 0 ? +(1000 * (durationSum / durationCount)).toFixed(2) : 0;

  return { avgResponseTimeMs, totalApiCalls, errorRatePercent };
}

