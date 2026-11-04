import { screen } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { fakeIncidents, INCIDENT_QUESTION } from '../fake-data';
import { aiRoutes } from '../routes';

describe('RootCausePage', () => {
  it('starts on the first incident with its timeline, cause and fixes', () => {
    renderRoutes(aiRoutes, ['/ai/root-cause']);

    const [incident] = fakeIncidents;
    expect(screen.getByRole('heading', { level: 1, name: 'Root Cause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: incident.label })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(incident.steps[0].text)).toBeInTheDocument();
    expect(screen.getByText('87% confidence')).toBeInTheDocument();
    expect(screen.getByText(incident.cause)).toBeInTheDocument();
    expect(screen.getByText(incident.fixes[0])).toBeInTheDocument();
  });

  it('switches the content when another incident is picked', async () => {
    const { user } = renderRoutes(aiRoutes, ['/ai/root-cause']);

    await user.click(screen.getByRole('button', { name: fakeIncidents[2].label }));

    expect(screen.getByText(fakeIncidents[2].cause)).toBeInTheDocument();
    expect(screen.queryByText(fakeIncidents[0].cause)).not.toBeInTheDocument();
  });

  it('falls back to the first incident for an invalid URL value', () => {
    renderRoutes(aiRoutes, ['/ai/root-cause?incident=99']);

    expect(screen.getByText(fakeIncidents[0].cause)).toBeInTheDocument();
  });

  it('opens the Assistant with the question already asked', async () => {
    const { user } = renderRoutes(aiRoutes, ['/ai/root-cause']);

    await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getAllByText(INCIDENT_QUESTION).length).toBeGreaterThan(0);
    expect(screen.getByText(/payments returned 503 on 38%/)).toBeInTheDocument();
  });
});
