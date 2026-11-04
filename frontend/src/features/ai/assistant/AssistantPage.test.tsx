import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { AssistantPage } from './AssistantPage';

describe('AssistantPage', () => {
  it('renders the heading and the empty state', () => {
    renderWithProviders(<AssistantPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
