import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { fakeReports } from '../fake-data';

export function ReportsPage() {
  const [generating, setGenerating] = useState(false);

  return (
    <>
      <PageHeader
        title="Raports"
        subtitle="Scheduled and on-demand exports"
        actions={
          <Button variant="primary" onClick={() => setGenerating(true)}>
            Generate report
          </Button>
        }
      />
      <div className="flex flex-col gap-5">
        {generating && (
          <Card role="status" className="border-accent! bg-accent-soft!">
            Report “Ad-hoc · last 24h” is being generated. It will appear below in a minute.
          </Card>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {fakeReports.map((report) => (
            <Card key={report.name} hoverable className="flex flex-col gap-2.5">
              <div className="text-[13px] text-muted">{report.schedule}</div>
              <h2 className="text-[17px] font-semibold">{report.name}</h2>
              <p className="text-sm leading-normal text-muted">{report.description}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span className="text-[13px] text-muted">Last: {report.lastRun}</span>
                <Button aria-label={`Download PDF of ${report.name}`}>Download PDF</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
