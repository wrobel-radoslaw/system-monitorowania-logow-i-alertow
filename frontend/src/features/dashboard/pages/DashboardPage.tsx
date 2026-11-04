import { useState } from 'react';
import { alertSeverityTone, fakeAlerts } from '@/shared/mocks/fake-alerts';
import { Badge } from '@/shared/ui/Badge';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Pill } from '@/shared/ui/Pill';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import {
  DEFAULT_RANGE,
  RANGES,
  dashboardData,
  type DashboardData,
  type RangeId,
} from '../fake-data';

const RECENT_ALERTS = 3;

const toneClass = {
  muted: 'text-muted',
  success: 'text-success',
  danger: 'text-danger',
};

function ErrorsChart({ chart }: { chart: DashboardData['chart'] }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold">{chart.title}</h2>
        <span className="text-[13px] text-muted">{chart.peak}</span>
      </div>
      <div
        role="img"
        aria-label={`${chart.title}, ${chart.peak}`}
        className="mt-5 flex h-[180px] items-end gap-1 border-b border-border"
      >
        {chart.heights.map((height, index) => (
          <div
            key={index}
            title={chart.barLabel(index)}
            style={{ height }}
            className="min-w-1 flex-1 rounded-t-[3px] bg-accent opacity-85 transition-opacity duration-150 hover:opacity-100"
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        {chart.axis.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </Card>
  );
}

function TopServices({ services }: { services: DashboardData['services'] }) {
  return (
    <Card>
      <h2 className="mb-3 text-[17px] font-bold">Top services by errors</h2>
      {services.map((service) => (
        <div
          key={service.name}
          className="grid grid-cols-[minmax(100px,1fr)_2fr_56px] items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-100 hover:bg-hover"
        >
          <span className="font-mono text-[13px] whitespace-nowrap">{service.name}</span>
          <ProgressBar percent={service.percent} />
          <span className="text-right text-sm">{service.count}</span>
        </div>
      ))}
    </Card>
  );
}

function RecentAlerts() {
  const alerts = fakeAlerts.filter((alert) => !alert.resolved).slice(0, RECENT_ALERTS);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Recent alerts</h2>
        <LinkButton to="/alerts">View all</LinkButton>
      </div>
      <ul>
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="flex items-center gap-3 rounded-md border-t border-border px-2 py-3 transition-colors duration-100 hover:bg-hover"
          >
            <Badge tone={alertSeverityTone[alert.severity]}>{alert.severity}</Badge>
            <span className="min-w-0 flex-1">{alert.title}</span>
            <span className="text-[13px] whitespace-nowrap text-muted">{alert.time}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<RangeId>(DEFAULT_RANGE);
  const data = dashboardData[range];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={data.subtitle}
        actions={
          <div role="group" aria-label="Time range" className="flex flex-wrap gap-2">
            {RANGES.map((id) => (
              <Pill key={id} active={id === range} onClick={() => setRange(id)}>
                {id}
              </Pill>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {data.kpis.map((kpi) => (
            <Card key={kpi.label} hoverable>
              <div className="text-sm text-muted">{kpi.label}</div>
              <div className="mt-2 text-[30px] font-bold">{kpi.value}</div>
              <div className={`mt-1.5 text-[13px] ${toneClass[kpi.tone]}`}>{kpi.delta}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
          <ErrorsChart chart={data.chart} />
          <TopServices services={data.services} />
        </div>

        <RecentAlerts />
      </div>
    </>
  );
}
