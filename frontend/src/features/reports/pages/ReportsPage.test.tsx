import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { ReportsPage } from './ReportsPage';

describe('ReportsPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<ReportsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
