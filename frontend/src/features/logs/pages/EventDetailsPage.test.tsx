import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockEvents } from '@/shared/mocks/events';
import { renderRoutes } from '@/shared/test/render';
import { server } from '@/shared/test/server';
import { logsRoutes } from '../routes';

describe('EventDetailsPage', () => {
  it('shows loading, then every field of the event', async () => {
    const event = mockEvents[0];
    renderRoutes(logsRoutes, [`/logs/${event.eventId}`]);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    expect(await screen.findByText(event.eventId)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Event details' })).toBeInTheDocument();
    expect(screen.getByText(event.machineId)).toBeInTheDocument();
    expect(screen.getByText(event.severity)).toBeInTheDocument();
    expect(screen.getByText(event.code)).toBeInTheDocument();
    expect(screen.getByText(event.message)).toBeInTheDocument();
    expect(screen.getByText(event.status)).toBeInTheDocument();
    expect(screen.getByText(new Date(event.timestamp).toLocaleString())).toBeInTheDocument();
  });

  it('opens from the list and links back to it', async () => {
    const newest = mockEvents.at(-1)!;
    const { user, router } = renderRoutes(logsRoutes, ['/logs']);

    await user.click(await screen.findByRole('link', { name: newest.message }));

    expect(await screen.findByText(newest.eventId)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/logs/${newest.eventId}`);

    await user.click(screen.getByRole('link', { name: 'Back to logs' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown event', async () => {
    renderRoutes(logsRoutes, ['/logs/does-not-exist']);

    expect(await screen.findByText('Event not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to logs' })).toBeInTheDocument();
  });

  it('shows the error state when the database is down', async () => {
    server.use(
      http.get('*/api/events/:eventId', () =>
        HttpResponse.json({ title: 'Service Unavailable', status: 503 }, { status: 503 }),
      ),
    );

    renderRoutes(logsRoutes, ['/logs/any-id']);

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is unavailable');
  });
});
