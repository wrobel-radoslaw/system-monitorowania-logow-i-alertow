// Fake data for designing the AI Analysis tabs. There is no AI backend yet (planned for M3, F-09).
import type { BadgeTone } from '@/shared/ui/Badge';

export type FakeSummary = {
  period: string;
  health: string;
  tone: BadgeTone;
  text: string;
  points: string[];
};

export const fakeSummaries: FakeSummary[] = [
  {
    period: 'Last hour',
    health: 'Degraded',
    tone: 'warn',
    text: 'Checkout reliability dropped between 14:02 and 14:19 because the database ran out of connections. Everything else ran within normal ranges.',
    points: [
      '1,204 errors, 71% from payments',
      'Root cause linked to worker-queue autoscaling (INC-2041)',
      'Error rate back under 1% since 14:20',
    ],
  },
  {
    period: 'Last 24 hours',
    health: 'Stable',
    tone: 'success',
    text: 'Two incidents, both mitigated. Log volume was 18% above the weekly average, driven by invoice rendering retries.',
    points: [
      '48.2k entries ingested per hour on average',
      'Slow logins 10:14–10:52 after auth-service v3.8.0',
      'No new security-relevant events',
    ],
  },
  {
    period: 'Last 7 days',
    health: 'Stable',
    tone: 'success',
    text: 'Error rate trended down 12% week over week. worker-queue remains the noisiest service and the most frequent incident trigger.',
    points: [
      '5 incidents, median time to resolve 23 min',
      'Top recurring signature: upstream timeout after 5000ms',
      'Consider a memory bump for invoice.render',
    ],
  },
];

export const fakeAnomalies = [
  {
    signal: 'Error rate spike',
    description: '5xx 9.4× above baseline on /checkout',
    service: 'payments',
    score: 96,
    time: '14:02',
    incident: 0,
  },
  {
    signal: 'Connection saturation',
    description: 'Pool usage 100% for 17 min',
    service: 'postgres',
    score: 91,
    time: '14:02',
    incident: 0,
  },
  {
    signal: 'Log volume surge',
    description: '3× more lines/hour, mostly retries',
    service: 'worker-queue',
    score: 78,
    time: '13:58',
    incident: 0,
  },
  {
    signal: 'Latency shift',
    description: 'Login p95 from 340 ms to 2.1 s',
    service: 'auth-service',
    score: 72,
    time: '10:21',
    incident: 1,
  },
  {
    signal: 'New error signature',
    description: '"pdf renderer OOM" first seen today',
    service: 'worker-queue',
    score: 64,
    time: '09:47',
    incident: 0,
  },
];

export const fakeIncidents = [
  {
    label: 'INC-2041 · Checkout 503s',
    confidence: '87%',
    cause:
      'worker-queue autoscaled from 8 to 12 replicas; each replica opens 4 DB connections, exhausting the Postgres pool (max 50). payments could not get a connection and timed out after 5 s.',
    steps: [
      {
        time: '14:01:47',
        service: 'worker-queue',
        text: 'Backlog passes 5,000 jobs (invoice.render retries).',
      },
      {
        time: '14:02:03',
        service: 'worker-queue',
        text: 'Autoscaler adds 4 replicas, +16 DB connections.',
      },
      {
        time: '14:02:20',
        service: 'postgres',
        text: 'Connection pool reaches 50/50; clients start queueing.',
      },
      {
        time: '14:02:41',
        service: 'payments',
        text: 'First upstream timeouts on POST /checkout → 503.',
      },
    ],
    fixes: [
      'Cap worker-queue DB connections with a per-replica pool of 2.',
      'Raise Postgres max_connections or add PgBouncer in front of db-primary.',
      'Give invoice.render 1Gi memory to stop the OOM retry loop.',
    ],
  },
  {
    label: 'INC-2038 · Slow logins',
    confidence: '74%',
    cause:
      'A new release of auth-service disabled the session cache, so every login hit the users table directly and p95 latency rose above 2 s.',
    steps: [
      {
        time: '10:14:00',
        service: 'deploy',
        text: 'auth-service v3.8.0 rolled out to production.',
      },
      { time: '10:16:32', service: 'auth-service', text: 'Cache hit ratio drops from 94% to 0%.' },
      {
        time: '10:21:10',
        service: 'auth-service',
        text: 'Login p95 exceeds 2,000 ms; alert fires.',
      },
    ],
    fixes: [
      'Re-enable SESSION_CACHE in the v3.8.x config.',
      'Add a cache-hit-ratio alert below 60%.',
    ],
  },
  {
    label: 'INC-2032 · 429 burst',
    confidence: '62%',
    cause:
      'Client partner-acme started a bulk sync without backoff, exceeding its 600 req/min quota.',
    steps: [
      {
        time: '08:00:02',
        service: 'api-gateway',
        text: 'Request rate from partner-acme jumps 9×.',
      },
      {
        time: '08:00:40',
        service: 'api-gateway',
        text: 'Rate limiter returns 429 to 71% of its requests.',
      },
    ],
    fixes: [
      'Contact partner-acme about retry backoff.',
      'Offer a bulk export endpoint for nightly syncs.',
    ],
  },
];

export const ASSISTANT_GREETING =
  'Hi! I have access to the last 7 days of logs from 4 services. What would you like to know?';

export const INCIDENT_QUESTION = 'Why did checkout fail at 14:05?';

const cannedAnswers: Record<string, string> = {
  [INCIDENT_QUESTION]:
    'Between 14:02 and 14:19, payments returned 503 on 38% of /checkout requests.\nThe trigger was the Postgres connection pool hitting its limit (max 50) after worker-queue scaled to 12 replicas. See Root Cause → INC-2041.',
  'Summarize errors in the last hour':
    '1,204 errors in the last hour, 71% from payments (timeouts to db-primary). auth-service is stable; api-gateway shows a small rise in 429s from one client.',
  'Which service is the noisiest today?':
    'worker-queue — 18.4k log lines/hour, 3× its baseline, mostly retry messages for job type "invoice.render".',
};

export const assistantSuggestions = Object.keys(cannedAnswers);

export function fakeAnswer(question: string) {
  return (
    cannedAnswers[question] ??
    `Searching logs for "${question}"… Found 37 matching entries across 2 services. The most frequent pattern is "upstream timeout after 5000ms" in payments.`
  );
}
