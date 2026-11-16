// Fake data for designing the Dashboard. The API has no aggregates yet, so nothing here is real.

export type RangeId = '1h' | '24h' | '7d';

export type DashboardData = {
  subtitle: string;
  kpis: { label: string; value: string; delta: string; tone: 'muted' | 'success' | 'danger' }[];
  chart: {
    title: string;
    peak: string;
    heights: number[];
    barLabel: (index: number) => string;
    axis: string[];
  };
  services: { name: string; count: string; percent: number }[];
};

const openAlerts = {
  label: 'Open alerts',
  value: '4',
  delta: '2 critical',
  tone: 'danger',
} as const;
const servicesReporting = {
  label: 'Services reporting',
  value: '4 / 4',
  delta: 'all healthy ingest',
  tone: 'success',
} as const;

export const RANGES: RangeId[] = ['1h', '24h', '7d'];
export const DEFAULT_RANGE: RangeId = '24h';

export const dashboardData: Record<RangeId, DashboardData> = {
  '1h': {
    subtitle: 'Last hour · all environments',
    kpis: [
      { label: 'Log entries (1h)', value: '48.2k', delta: '+6% vs previous hour', tone: 'muted' },
      { label: 'Error rate', value: '2.50%', delta: '+1.7 pp vs previous hour', tone: 'danger' },
      openAlerts,
      servicesReporting,
    ],
    chart: {
      title: 'Errors per 5 minutes',
      peak: 'peak 14:05 · 244',
      heights: [34, 42, 160, 148, 96, 74, 60, 52, 48, 44, 40, 36],
      barLabel: (index) => `${5 * index} min`,
      axis: ['60 min ago', '30 min ago', 'now'],
    },
    services: [
      { name: 'payments', count: '855', percent: 100 },
      { name: 'worker-queue', count: '192', percent: 22 },
      { name: 'postgres', count: '84', percent: 10 },
      { name: 'api-gateway', count: '51', percent: 6 },
      { name: 'auth-service', count: '22', percent: 3 },
    ],
  },
  '24h': {
    subtitle: 'Last 24 hours · all environments',
    kpis: [
      { label: 'Log entries (24h)', value: '1.16M', delta: '+18% vs yesterday', tone: 'muted' },
      { label: 'Error rate', value: '0.84%', delta: '−0.3 pp vs yesterday', tone: 'success' },
      openAlerts,
      servicesReporting,
    ],
    chart: {
      title: 'Errors per hour',
      peak: 'peak 14:00 · 412',
      heights: [
        22, 18, 15, 12, 10, 12, 20, 34, 48, 62, 70, 88, 104, 132, 160, 118, 96, 84, 72, 64, 50, 40,
        34, 28,
      ],
      barLabel: (index) => `${String(index).padStart(2, '0')}:00`,
      axis: ['00:00', '06:00', '12:00', '18:00', 'now'],
    },
    services: [
      { name: 'payments', count: '2,931', percent: 100 },
      { name: 'worker-queue', count: '1,874', percent: 64 },
      { name: 'api-gateway', count: '612', percent: 21 },
      { name: 'auth-service', count: '388', percent: 13 },
      { name: 'postgres', count: '205', percent: 7 },
    ],
  },
  '7d': {
    subtitle: 'Last 7 days · all environments',
    kpis: [
      { label: 'Log entries (7d)', value: '8.09M', delta: '+4% vs previous week', tone: 'muted' },
      { label: 'Error rate', value: '0.91%', delta: '−0.1 pp vs previous week', tone: 'success' },
      openAlerts,
      servicesReporting,
    ],
    chart: {
      title: 'Errors per day',
      peak: 'peak Tue · 9,764',
      heights: [120, 160, 118, 104, 96, 62, 112],
      barLabel: (index) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      axis: ['Mon', 'Thu', 'Sun'],
    },
    services: [
      { name: 'payments', count: '19,204', percent: 100 },
      { name: 'worker-queue', count: '13,882', percent: 72 },
      { name: 'api-gateway', count: '4,106', percent: 21 },
      { name: 'auth-service', count: '3,020', percent: 16 },
      { name: 'postgres', count: '1,377', percent: 7 },
    ],
  },
};
