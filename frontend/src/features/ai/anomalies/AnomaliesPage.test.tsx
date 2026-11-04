import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { AnomaliesPage } from './AnomaliesPage';

describe('AnomaliesPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<AnomaliesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Anomalies' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
