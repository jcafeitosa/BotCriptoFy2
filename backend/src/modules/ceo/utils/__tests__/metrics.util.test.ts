import { describe, expect, test } from 'bun:test';
import { summarizeHttpMetrics } from '../../utils/metrics.util';

describe('summarizeHttpMetrics', () => {
  test('computes avg response time, total calls and error rate', () => {
    const metricsJSON = [
      {
        name: 'http_requests_total',
        type: 'counter',
        values: [
          { labels: { method: 'GET', path: '/api', status: '200' }, value: 90 },
          { labels: { method: 'GET', path: '/api', status: '500' }, value: 10 },
        ],
      },
      {
        name: 'http_request_duration_seconds',
        type: 'histogram',
        values: [
          { metricNameSuffix: 'sum', value: 5 }, // seconds
          { metricNameSuffix: 'count', value: 100 },
        ],
      },
    ];

    const s = summarizeHttpMetrics(metricsJSON as any);
    expect(s.totalApiCalls).toBe(100);
    expect(s.errorRatePercent).toBe(10); // 10%
    expect(s.avgResponseTimeMs).toBeCloseTo(50, 2); // 5s/100 = 0.05s => 50ms
  });

  test('handles missing metrics gracefully', () => {
    const s = summarizeHttpMetrics([] as any);
    expect(s.totalApiCalls).toBe(0);
    expect(s.errorRatePercent).toBe(0);
    expect(s.avgResponseTimeMs).toBe(0);
  });
});

