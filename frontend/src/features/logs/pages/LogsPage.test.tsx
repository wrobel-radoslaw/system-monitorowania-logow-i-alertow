import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockEvents } from '@/shared/mocks/events';
import { renderWithProviders } from '@/shared/test/render';
import { server } from '@/shared/test/server';
import { LogsPage } from './LogsPage';

/** Records the query string of every list request while still using the mock response. */
function recordRequests() {
  const searches: URLSearchParams[] = [];
  server.events.on('request:start', ({ request }) => {
    searches.push(new URL(request.url).searchParams);
  });
  return searches;
}

/** Data rows only, without the table header. */
const dataRows = () => screen.getAllByRole('row').slice(1);

const newestFirst = [...mockEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

describe('LogsPage', () => {
  afterEach(() => {
    server.events.removeAllListeners();
    vi.unstubAllEnvs();
  });

  it('shows loading, then the first page of events, newest first', async () => {
    renderWithProviders(<LogsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    expect(await screen.findByText(/Showing 10 of 110 entries/)).toHaveTextContent(
      'auto-refresh every 5 s',
    );
    expect(dataRows()).toHaveLength(10);

    const firstRow = within(dataRows()[0]);
    expect(firstRow.getByText('14:05:12.381')).toBeInTheDocument();
    expect(firstRow.getByText('ERROR')).toBeInTheDocument();
    expect(firstRow.getByText('payments')).toBeInTheDocument();
    expect(firstRow.getByRole('link', { name: /POST \/checkout 503/ })).toHaveAttribute(
      'href',
      '/logs/fake-log-1',
    );
  });

  it('sends the chosen level to the API and shows only matching events', async () => {
    const searches = recordRequests();
    const { user } = renderWithProviders(<LogsPage />);
    await screen.findByText(/of 110 entries/);

    await user.click(screen.getByRole('button', { name: 'Errors' }));

    const expected = mockEvents.filter((event) => event.severity === 'ERROR').length;
    await screen.findByText(new RegExp(`of ${expected} entries`));
    expect(searches.at(-1)?.get('severity')).toBe('ERROR');
    expect(screen.getByRole('button', { name: 'Errors' })).toHaveAttribute('aria-pressed', 'true');
    for (const row of dataRows()) {
      expect(within(row).getByText('ERROR')).toBeInTheDocument();
    }
  });

  it('hides search with the real API, which would ignore it', async () => {
    renderWithProviders(<LogsPage />);
    await screen.findByText(/of 110 entries/);

    expect(screen.queryByRole('searchbox', { name: 'Search logs' })).not.toBeInTheDocument();
    expect(screen.getByText('Events from all machines')).toBeInTheDocument();
  });

  it('searches text and service with mocks on', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const searches = recordRequests();
    const { user } = renderWithProviders(<LogsPage />);
    await screen.findByText(/of 110 entries/);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search logs' }),
      'service:payments timeout',
    );

    await screen.findByText(/Showing 1 of 1 entries/);
    expect(searches.at(-1)?.get('search')).toBe('service:payments timeout');
    expect(within(dataRows()[0]).getByRole('link')).toHaveAttribute('href', '/logs/fake-log-1');
  });

  it('keeps the extra filters closed until asked for', async () => {
    const { user } = renderWithProviders(<LogsPage />);
    await screen.findByText(/of 110 entries/);
    expect(screen.queryByLabelText('Machine')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More filters' }));

    expect(screen.getByLabelText('Machine')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('combines filters from the URL when the page loads', async () => {
    const searches = recordRequests();
    renderWithProviders(<LogsPage />, { route: '/logs?machineId=cnc-03&status=NEW' });

    const expected = mockEvents.filter(
      (event) => event.machineId === 'cnc-03' && event.status === 'NEW',
    ).length;
    await screen.findByText(new RegExp(`of ${expected} entries`));

    expect(screen.getByLabelText('Machine')).toHaveValue('cnc-03');
    expect(screen.getByLabelText('Status')).toHaveValue('NEW');
    expect(searches.at(-1)?.get('machineId')).toBe('cnc-03');
    expect(searches.at(-1)?.get('status')).toBe('NEW');
  });

  it('sends date filters to the API as UTC', async () => {
    const searches = recordRequests();
    renderWithProviders(<LogsPage />, { route: '/logs?from=2026-01-01T02:00' });

    await waitFor(() => expect(searches.length).toBeGreaterThan(0));

    expect(searches.at(-1)?.get('from')).toBe(new Date('2026-01-01T02:00').toISOString());
  });

  it('ignores invalid filter values in the URL', async () => {
    const searches = recordRequests();
    renderWithProviders(<LogsPage />, { route: '/logs?severity=NOPE&from=nonsense&page=-3' });

    await screen.findByText(/of 110 entries/);

    expect(searches.at(-1)?.has('severity')).toBe(false);
    expect(searches.at(-1)?.has('from')).toBe(false);
    expect(searches.at(-1)?.get('page')).toBe('1');
  });

  it('moves between pages', async () => {
    const { user } = renderWithProviders(<LogsPage />);
    await screen.findByText('Page 1 of 11');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText('Page 2 of 11');
    await waitFor(() => {
      expect(within(dataRows()[0]).getByRole('link')).toHaveAttribute(
        'href',
        `/logs/${newestFirst[10].eventId}`,
      );
    });
  });

  it('returns to the first page when a filter changes', async () => {
    const searches = recordRequests();
    const { user } = renderWithProviders(<LogsPage />, { route: '/logs?page=3' });
    await screen.findByText('Page 3 of 11');

    await user.click(screen.getByRole('button', { name: 'Info' }));

    await screen.findByText(/Page 1 of/);
    expect(searches.at(-1)?.get('page')).toBe('1');
  });

  it('clears all filters', async () => {
    const { user } = renderWithProviders(<LogsPage />, {
      route: '/logs?severity=WARN&status=NEW',
    });
    await screen.findByLabelText('Status');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await screen.findByText(/of 110 entries/);
  });

  it('shows the empty state when nothing matches', async () => {
    renderWithProviders(<LogsPage />, { route: '/logs?from=2030-01-01T00:00' });

    expect(await screen.findByText('No events match these filters')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('can get back from a page past the last one', async () => {
    const { user } = renderWithProviders(<LogsPage />, { route: '/logs?page=99' });
    await screen.findByText('No events match these filters');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    await screen.findByText('Page 11 of 11');
  });

  it('explains a rejected date range', async () => {
    renderWithProviders(<LogsPage />, {
      route: '/logs?from=2026-02-01T00:00&to=2026-01-01T00:00',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the date range');
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });

  it('shows the error state when the API is down', async () => {
    server.use(http.get('*/api/events', () => HttpResponse.error()));

    renderWithProviders(<LogsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Check that the API is running');
  });
});
