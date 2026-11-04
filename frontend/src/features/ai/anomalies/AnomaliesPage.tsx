import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { fakeAnomalies } from '../fake-data';

const headers = ['Signal', 'Service', 'Score', 'Detected', 'Action'];
const cell = 'px-2 py-3.5 first:pl-5 last:pr-5';

export function AnomaliesPage() {
  return (
    <>
      <PageHeader
        title="Anomalies"
        subtitle="Deviations from the 14-day baseline, ranked by score"
      />
      <Card flush className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[13px] text-muted">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-2 py-3 font-normal first:pl-5 last:pr-5 ${
                    header === 'Action' ? 'sr-only' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fakeAnomalies.map((anomaly) => (
              <tr
                key={anomaly.signal}
                className="border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-hover"
              >
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
                  <LinkButton
                    to={`/ai/root-cause?incident=${anomaly.incident}`}
                    aria-label={`Investigate ${anomaly.signal}`}
                  >
                    Investigate
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
