import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api-client';
import { MACHINE_IDS } from '@/features/logs';
import type { StatusTone } from './StatusDot';

const HEALTH_REFRESH_MS = 30_000;

type IngestStatus = { text: string; short: string; tone: StatusTone };

/** Driven by /api/health, so the UI never claims ingest is live while the API is down. */
export function useIngestStatus(): IngestStatus {
  const { isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiFetch('/api/health', { signal }),
    refetchInterval: HEALTH_REFRESH_MS,
  });

  if (isPending) return { text: 'Checking API...', short: 'Checking', tone: 'pending' };
  if (isError) return { text: 'API unavailable', short: 'Offline', tone: 'error' };
  return { text: `Ingest live · ${MACHINE_IDS.length} sources`, short: 'Live', tone: 'ok' };
}
