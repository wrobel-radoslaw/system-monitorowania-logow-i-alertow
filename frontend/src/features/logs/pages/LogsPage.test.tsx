import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { LogsPage } from './LogsPage';

describe('LogsPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<LogsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
