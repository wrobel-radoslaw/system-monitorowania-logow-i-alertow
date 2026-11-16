import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import type { EventStatus } from '../types';

const statusTone: Record<EventStatus, BadgeTone> = {
  NEW: 'warn',
  ACKNOWLEDGED: 'info',
  RESOLVED: 'success',
};

const statusLabel: Record<EventStatus, string> = {
  NEW: 'New',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}
