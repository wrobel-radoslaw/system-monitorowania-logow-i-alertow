import type { Severity } from '../types';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';

const severityTone: Record<Severity, BadgeTone> = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'danger',
  CRITICAL: 'critical',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={severityTone[severity]}>{severity}</Badge>;
}
