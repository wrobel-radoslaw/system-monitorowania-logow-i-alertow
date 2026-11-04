import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/shared/test/render';
import { routes } from '../router';

function mainNav() {
  return within(screen.getByRole('navigation', { name: 'Main' }));
}

describe('Sidebar', () => {
  it('renders all five nav items in order', () => {
    renderRoutes(routes, ['/dashboard']);

    expect(
      mainNav()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Logs', 'Alerts', 'Reports', 'AI Analysis']);
  });

  it('marks the active item with aria-current="page"', () => {
    renderRoutes(routes, ['/dashboard']);

    expect(mainNav().getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(mainNav().getByRole('link', { name: 'Logs' })).not.toHaveAttribute('aria-current');
  });

  it('navigates to the page when a nav item is clicked', async () => {
    const { user } = renderRoutes(routes, ['/dashboard']);

    await user.click(mainNav().getByRole('link', { name: 'Logs' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument();
    expect(mainNav().getByRole('link', { name: 'Logs' })).toHaveAttribute('aria-current', 'page');
    expect(mainNav().getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('keeps AI Analysis active on nested AI routes', () => {
    renderRoutes(routes, ['/ai/anomalies']);

    expect(mainNav().getByRole('link', { name: 'AI Analysis' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('toggles between dark and light theme', async () => {
    const { user } = renderRoutes(routes, ['/dashboard']);

    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
