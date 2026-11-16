import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { mockViewport } from '@/shared/test/viewport';
import { routes } from '../router';

const labels = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('AppLayout', () => {
  it('shows the sidebar and no menu button on desktop', () => {
    renderRoutes(routes, ['/dashboard']);

    expect(screen.getByText('Log Monitor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
  });

  it('shows a top bar and horizontal nav on tablet', () => {
    mockViewport('tablet');
    renderRoutes(routes, ['/logs']);

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(labels(main)).toEqual(['Dashboard', 'Logs', 'Alerts', 'Reports', 'AI Analysis']);
    expect(within(main).getByRole('link', { name: 'Logs' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows a bottom nav with short labels on mobile', () => {
    mockViewport('mobile');
    renderRoutes(routes, ['/ai/summaries']);

    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(labels(main)).toEqual(['Dashboard', 'Logs', 'Alerts', 'Reports', 'AI']);
    expect(within(main).getByRole('link', { name: 'AI' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens the drawer, navigates from it and closes it', async () => {
    mockViewport('mobile');
    const { user } = renderRoutes(routes, ['/dashboard']);

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    const drawerNav = screen.getByRole('navigation', { name: 'Menu' });
    await user.click(within(drawerNav).getByRole('link', { name: 'Alerts' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Alerts' })).toBeInTheDocument();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('closes the drawer with Escape', async () => {
    mockViewport('tablet');
    const { user } = renderRoutes(routes, ['/dashboard']);

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuButton);
    await user.keyboard('{Escape}');

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps both theme toggles in sync', async () => {
    mockViewport('mobile');
    const { user } = renderRoutes(routes, ['/dashboard']);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const [topBarToggle] = screen.getAllByRole('button', { name: 'Switch to light theme' });
    await user.click(topBarToggle);

    expect(screen.queryAllByRole('button', { name: 'Switch to light theme' })).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Switch to dark theme' })).toHaveLength(2);
  });
});
