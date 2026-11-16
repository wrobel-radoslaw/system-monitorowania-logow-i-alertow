import { useDevice } from '@/shared/lib/useDevice';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Table, TableRow, tableCell } from '@/shared/ui/Table';
import { fakeAnomalies } from '../mocks/fake-data';

type Anomaly = (typeof fakeAnomalies)[number];

const headers = ['Signal', 'Service', 'Score', 'Detected', 'Action'];
const cell = `${tableCell} py-3.5`;

function InvestigateButton({ anomaly }: { anomaly: Anomaly }) {
  return (
    <LinkButton
      to={`/ai/root-cause?incident=${anomaly.incident}`}
      aria-label={`Investigate ${anomaly.signal}`}
    >
      Investigate
    </LinkButton>
  );
}

/** Phones get one card per anomaly instead of a table that would scroll sideways. */
function AnomalyCards() {
  return (
    <ul className="flex flex-col gap-2.5">
      {fakeAnomalies.map((anomaly) => (
        <li key={anomaly.signal}>
          <Card hoverable className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{anomaly.signal}</span>
              <span className="text-[13px] whitespace-nowrap text-muted">{anomaly.time}</span>
            </div>
            <p className="text-sm text-muted">
              <span className="font-mono">{anomaly.service}</span> · {anomaly.description}
            </p>
            <div className="flex items-center gap-2.5">
              <ProgressBar percent={anomaly.score} className="flex-1" />
              <span className="text-[13px]">{anomaly.score}</span>
              <InvestigateButton anomaly={anomaly} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function AnomalyTable() {
  return (
    <Table headers={headers} hiddenHeaders={['Action']} minWidth="min-w-[720px]">
      {fakeAnomalies.map((anomaly) => (
        <TableRow key={anomaly.signal}>
          <td className={cell}>
            <div className="font-semibold">{anomaly.signal}</div>
            <div className="mt-[3px] text-[13px] text-muted">{anomaly.description}</div>
          </td>
          <td className={`${cell} font-mono text-[13px]`}>{anomaly.service}</td>
          <td className={`${cell} w-[176px]`}>
            <div className="flex items-center gap-2">
              <ProgressBar percent={anomaly.score} className="flex-1" />
              <span className="w-7 text-[13px]">{anomaly.score}</span>
            </div>
          </td>
          <td className={`${cell} w-[106px] text-[13px] text-muted`}>{anomaly.time}</td>
          <td className={`${cell} w-[130px]`}>
            <InvestigateButton anomaly={anomaly} />
          </td>
        </TableRow>
      ))}
    </Table>
  );
}

export function AnomaliesPage() {
  const device = useDevice();

  return (
    <>
      <PageHeader
        title="Anomalies"
        subtitle="Deviations from the 14-day baseline, ranked by score"
      />
      {device === 'mobile' ? <AnomalyCards /> : <AnomalyTable />}
    </>
  );
}
