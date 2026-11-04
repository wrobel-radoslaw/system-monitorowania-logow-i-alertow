import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { RootCausePage } from './RootCausePage';

describe('RootCausePage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<RootCausePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Root Cause' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
