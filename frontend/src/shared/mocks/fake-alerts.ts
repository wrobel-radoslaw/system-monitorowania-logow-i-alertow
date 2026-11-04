import type { BadgeTone } from '@/shared/ui/Badge';

// Fake data for designing the Alerts page and the Dashboard's "Recent alerts".
// Replace with GET /api/alerts when the Alerts page is connected (M2).

export type FakeAlertSeverity = 'Critical' | 'Warning' | 'Info';

export type FakeAlert = {
  id: number;
  severity: FakeAlertSeverity;
  title: string;
  service: string;
  rule: string;
  time: string;
  resolved?: boolean;
};

export const alertSeverityTone: Record<FakeAlertSeverity, BadgeTone> = {
  Critical: 'danger',
  Warning: 'warn',
  Info: 'info',
};

export const fakeAlerts: FakeAlert[] = [
  {
    id: 1,
    severity: 'Critical',
    title: 'payments: 5xx rate above 5% for 10 min',
    service: 'payments',
    rule: 'error-rate > 5%',
    time: '12 min ago',
  },
  {
    id: 2,
    severity: 'Warning',
    title: 'db-primary: connection pool at 96%',
    service: 'postgres',
    rule: 'pool usage > 90%',
    time: '18 min ago',
  },
  {
    id: 3,
    severity: 'Warning',
    title: 'worker-queue: backlog over 5,000 jobs',
    service: 'worker-queue',
    rule: 'queue depth > 5k',
    time: '41 min ago',
  },
  {
    id: 4,
    severity: 'Info',
    title: 'api-gateway: unusual 429 volume from one client',
    service: 'api-gateway',
    rule: 'anomaly score > 70',
    time: '1 h ago',
  },
  {
    id: 5,
    severity: 'Critical',
    title: 'auth-service: login latency p95 above 2 s',
    service: 'auth-service',
    rule: 'p95 > 2000 ms',
    time: '3 h ago',
    resolved: true,
  },
];
