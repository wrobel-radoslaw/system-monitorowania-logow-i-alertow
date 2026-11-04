import { screen } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { routes } from './router';

describe('router', () => {
  it('redirects "/" to the Dashboard', async () => {
    const { router } = renderRoutes(routes, ['/']);

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('redirects "/ai" to Summaries', async () => {
    const { router } = renderRoutes(routes, ['/ai']);

    expect(await screen.findByRole('heading', { level: 1, name: 'Summaries' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/ai/summaries');
    expect(screen.getByRole('link', { name: 'Summaries' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the 404 page for an unknown route', async () => {
    renderRoutes(routes, ['/this-route-does-not-exist']);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
