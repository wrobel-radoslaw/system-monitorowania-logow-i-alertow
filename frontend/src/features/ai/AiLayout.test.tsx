import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { aiRoutes } from './routes';

describe('AiLayout', () => {
  it('renders the four tabs in order', () => {
    renderRoutes(aiRoutes, ['/ai/summaries']);

    const tabs = within(screen.getByRole('navigation', { name: 'AI Analysis' })).getAllByRole(
      'link',
    );
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Summaries',
      'Anomalies',
      'Root Cause',
      'Assistant',
    ]);
  });

  it('marks the active tab with aria-current="page"', () => {
    renderRoutes(aiRoutes, ['/ai/root-cause']);

    expect(screen.getByRole('link', { name: 'Root Cause' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Summaries' })).not.toHaveAttribute('aria-current');
  });

  it('shows the matching page when a tab is clicked', async () => {
    const { user } = renderRoutes(aiRoutes, ['/ai/summaries']);

    await user.click(screen.getByRole('link', { name: 'Anomalies' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Anomalies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anomalies' })).toHaveAttribute('aria-current', 'page');
  });
});
