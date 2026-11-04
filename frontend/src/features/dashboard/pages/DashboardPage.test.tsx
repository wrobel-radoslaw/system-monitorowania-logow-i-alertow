import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
