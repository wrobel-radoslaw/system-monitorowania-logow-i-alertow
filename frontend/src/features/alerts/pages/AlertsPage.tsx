import { useState } from 'react';
import { alertSeverityTone, fakeAlerts, type FakeAlert } from '@/shared/mocks/fake-alerts';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';

type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';

const statusClass: Record<AlertStatus, string> = {
  Open: 'text-danger',
  Acknowledged: 'text-muted',
  Resolved: 'text-success',
};

function statusOf(alert: FakeAlert, acknowledged: Set<number>): AlertStatus {
  if (alert.resolved) return 'Resolved';
  return acknowledged.has(alert.id) ? 'Acknowledged' : 'Open';
}

export function AlertsPage() {
  // Fake data for now: acknowledging lasts until the page is left. The real PATCH comes in M2.
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());

  const openCount = fakeAlerts.filter((alert) => statusOf(alert, acknowledged) === 'Open').length;

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle={`${openCount} open · rules evaluated every minute`}
        actions={<Button variant="primary">New alert rule</Button>}
      />
      <ul className="flex flex-col gap-3">
        {fakeAlerts.map((alert) => {
          const status = statusOf(alert, acknowledged);
          return (
            <li key={alert.id}>
              <Card hoverable className="flex flex-wrap items-center gap-4">
                <Badge tone={alertSeverityTone[alert.severity]}>{alert.severity}</Badge>
                <div className="min-w-0 flex-[1_1_280px]">
                  <div className="font-semibold">{alert.title}</div>
                  <div className="mt-1 text-sm text-muted">
                    {alert.service} · {alert.rule} · {alert.time}
                  </div>
                </div>
                <span className={`text-sm ${statusClass[status]}`}>{status}</span>
                {status === 'Open' && (
                  <Button
                    aria-label={`Acknowledge ${alert.title}`}
                    onClick={() => setAcknowledged((current) => new Set(current).add(alert.id))}
                  >
                    Acknowledge
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
