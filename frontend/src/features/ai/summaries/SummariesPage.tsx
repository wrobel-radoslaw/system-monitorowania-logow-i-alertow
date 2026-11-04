import { useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { fakeSummaries } from '../fake-data';

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function SummariesPage() {
  const [regenerated, setRegenerated] = useState(false);

  return (
    <>
      <PageHeader
        title="Summaries"
        subtitle={`AI-written digests of what happened in your logs · ${
          regenerated ? 'regenerated just now' : 'updated 4 min ago'
        }`}
        actions={
          <Button variant="primary" onClick={() => setRegenerated(true)}>
            <RefreshIcon />
            Regenerate
          </Button>
        }
      />
      <div className="flex flex-col gap-5">
        {fakeSummaries.map((summary) => (
          <Card key={summary.period} hoverable>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{summary.period}</h2>
              <Badge tone={summary.tone}>{summary.health}</Badge>
            </div>
            <p className="my-3 leading-relaxed">{summary.text}</p>
            <ul className="list-disc pl-5 leading-[1.8] text-muted">
              {summary.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
