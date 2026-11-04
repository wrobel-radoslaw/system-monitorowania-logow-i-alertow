import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { fakeAnomalies } from '../fake-data';
import { aiRoutes } from '../routes';

describe('AnomaliesPage', () => {
  it('lists the anomalies with their scores', () => {
    renderRoutes(aiRoutes, ['/ai/anomalies']);

    expect(screen.getByRole('heading', { level: 1, name: 'Anomalies' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(fakeAnomalies.length);

    const first = within(rows[0]);
    expect(first.getByText('Error rate spike')).toBeInTheDocument();
    expect(first.getByText('payments')).toBeInTheDocument();
    expect(first.getByText('96')).toBeInTheDocument();
    expect(first.getByText('14:02')).toBeInTheDocument();
  });

  it('opens Root Cause on the incident of the investigated anomaly', async () => {
    const { user, router } = renderRoutes(aiRoutes, ['/ai/anomalies']);

    await user.click(screen.getByRole('link', { name: 'Investigate Latency shift' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Root Cause' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?incident=1');
    expect(screen.getByRole('button', { name: 'INC-2038 · Slow logins' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
