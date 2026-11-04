import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { AlertsPage } from './AlertsPage';

describe('AlertsPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<AlertsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
