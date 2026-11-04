import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('starts on the 24h range with its KPIs, chart and services', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours · all environments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1.16M')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Errors per hour, peak 14:00 · 412' })).toBeVisible();
    expect(screen.getByTitle('14:00')).toBeInTheDocument();
    expect(screen.getByText('2,931')).toBeInTheDocument();
  });

  it('switches the data when another range is picked', async () => {
    const { user } = renderWithProviders(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: '7d' }));

    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Last 7 days · all environments')).toBeInTheDocument();
    expect(screen.getByText('8.09M')).toBeInTheDocument();
    expect(screen.queryByText('1.16M')).not.toBeInTheDocument();
  });

  it('shows the three newest open alerts and links to all of them', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('payments: 5xx rate above 5% for 10 min')).toBeInTheDocument();
    expect(screen.getByText('worker-queue: backlog over 5,000 jobs')).toBeInTheDocument();
    expect(screen.queryByText(/api-gateway: unusual/)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth-service: login latency/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/alerts');
  });
});
