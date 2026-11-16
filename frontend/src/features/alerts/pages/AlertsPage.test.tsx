import { screen, within } from '@testing-library/react';
import { fakeAlerts } from '@/shared/mocks/fake-alerts';
import { renderWithProviders } from '@/shared/test/render';
import { AlertsPage } from './AlertsPage';

describe('AlertsPage', () => {
  it('lists every alert with its severity, details and status', () => {
    renderWithProviders(<AlertsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByText('4 open · rules evaluated every minute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New alert rule' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(fakeAlerts.length);

    const first = within(screen.getAllByRole('listitem')[0]);
    expect(first.getByText('Critical')).toBeInTheDocument();
    expect(first.getByText('payments: 5xx rate above 5% for 10 min')).toBeInTheDocument();
    expect(first.getByText('payments · error-rate > 5% · 12 min ago')).toBeInTheDocument();
    expect(first.getByText('Open')).toBeInTheDocument();
  });

  it('offers no Acknowledge on a resolved alert', () => {
    renderWithProviders(<AlertsPage />);

    const resolved = within(screen.getAllByRole('listitem')[4]);
    expect(resolved.getByText('Resolved')).toBeInTheDocument();
    expect(resolved.queryByRole('button')).not.toBeInTheDocument();
  });

  it('acknowledges an open alert and lowers the open count', async () => {
    const { user } = renderWithProviders(<AlertsPage />);
    const first = within(screen.getAllByRole('listitem')[0]);

    await user.click(first.getByRole('button', { name: /^Acknowledge/ }));

    expect(first.getByText('Acknowledged')).toBeInTheDocument();
    expect(first.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('3 open · rules evaluated every minute')).toBeInTheDocument();
  });
});
