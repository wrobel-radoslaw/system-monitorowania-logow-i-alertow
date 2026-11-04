import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { fakeSummaries } from '../fake-data';
import { SummariesPage } from './SummariesPage';

describe('SummariesPage', () => {
  it('shows a card with health and points for each period', () => {
    renderWithProviders(<SummariesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Summaries' })).toBeInTheDocument();
    for (const summary of fakeSummaries) {
      expect(screen.getByRole('heading', { level: 2, name: summary.period })).toBeInTheDocument();
      expect(screen.getByText(summary.points[0])).toBeInTheDocument();
    }
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getAllByText('Stable')).toHaveLength(2);
  });

  it('updates the timestamp when regenerated', async () => {
    const { user } = renderWithProviders(<SummariesPage />);
    expect(screen.getByText(/updated 4 min ago/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(screen.getByText(/regenerated just now/)).toBeInTheDocument();
  });
});
