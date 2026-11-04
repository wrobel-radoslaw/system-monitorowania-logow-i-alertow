import type { Severity } from '@/shared/types/events';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';

const severityTone: Record<Severity, BadgeTone> = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'danger',
  CRITICAL: 'danger',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={severityTone[severity]}>{severity}</Badge>;
}
