import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { SummariesPage } from './SummariesPage';

describe('SummariesPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<SummariesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Summaries' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
