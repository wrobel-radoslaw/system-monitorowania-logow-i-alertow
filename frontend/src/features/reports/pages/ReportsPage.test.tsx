import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { fakeReports } from '../fake-data';
import { ReportsPage } from './ReportsPage';

describe('ReportsPage', () => {
  it('shows a card for every report', () => {
    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Raports' })).toBeInTheDocument();
    expect(screen.getByText('Scheduled and on-demand exports')).toBeInTheDocument();
    for (const report of fakeReports) {
      expect(screen.getByRole('heading', { level: 2, name: report.name })).toBeInTheDocument();
      expect(screen.getByText(`Last: ${report.lastRun}`)).toBeInTheDocument();
    }
  });

  it('confirms when a report is generated', async () => {
    const { user } = renderWithProviders(<ReportsPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(screen.getByRole('status')).toHaveTextContent('is being generated');
  });
});
