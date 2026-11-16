import { useNavigate, useSearchParams } from 'react-router';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CardTitle } from '@/shared/ui/CardTitle';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Pill } from '@/shared/ui/Pill';
import { PillGroup } from '@/shared/ui/PillGroup';
import { fakeIncidents, INCIDENT_QUESTION } from '../mocks/fake-data';

function readIncident(params: URLSearchParams) {
  const index = Number(params.get('incident'));
  return Number.isInteger(index) && fakeIncidents[index] ? index : 0;
}

export function RootCausePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selected = readIncident(searchParams);
  const incident = fakeIncidents[selected];

  return (
    <>
      <PageHeader
        title="Root Cause"
        subtitle="Pick an incident to see the reconstructed chain of events"
      />
      <div className="flex flex-col gap-5">
        <PillGroup label="Incident">
          {fakeIncidents.map((item, index) => (
            <Pill
              key={item.label}
              active={index === selected}
              onClick={() => setSearchParams({ incident: String(index) }, { replace: true })}
            >
              {item.label}
            </Pill>
          ))}
        </PillGroup>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
          <Card>
            <CardTitle className="mb-4">Timeline</CardTitle>
            <ol>
              {incident.steps.map((step) => (
                <li key={step.time} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className="mt-[5px] size-2.5 shrink-0 rounded-full border-2 border-accent"
                    />
                    <span aria-hidden="true" className="my-1 w-0.5 flex-1 bg-border" />
                  </div>
                  <div className="pb-[18px]">
                    <div className="font-mono text-[13px] text-muted">
                      {step.time} · {step.service}
                    </div>
                    <div className="mt-1 leading-normal">{step.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex flex-col gap-4">
            <Card variant="accent">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Probable cause</CardTitle>
                <Badge tone="success">{incident.confidence} confidence</Badge>
              </div>
              <p className="mt-3 leading-relaxed">{incident.cause}</p>
            </Card>
            <Card>
              <CardTitle className="mb-2.5">Suggested fix</CardTitle>
              <ol className="list-decimal pl-5 leading-[1.8] text-muted">
                {incident.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate('/ai/assistant', { state: { question: INCIDENT_QUESTION } })
                  }
                >
                  Ask Assistant
                </Button>
                <Button>Create ticket</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
