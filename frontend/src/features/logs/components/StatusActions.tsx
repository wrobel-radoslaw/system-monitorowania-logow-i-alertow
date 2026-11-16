import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api-client';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { changeEventStatus, eventListsKey, eventQueryOptions } from '../api/events-api';
import type { EventDto, EventStatus } from '../types';

type Action = { label: string; to: EventStatus; primary?: boolean };

// Which moves the UI offers from each status. The API itself allows any change.
const actionsFor: Record<EventStatus, Action[]> = {
  NEW: [
    { label: 'Acknowledge', to: 'ACKNOWLEDGED', primary: true },
    { label: 'Resolve', to: 'RESOLVED' },
  ],
  ACKNOWLEDGED: [{ label: 'Resolve', to: 'RESOLVED', primary: true }],
  RESOLVED: [{ label: 'Reopen', to: 'NEW' }],
};

/** Status buttons for one event. Sends the status it shows, so a stale page gets a 409. */
export function StatusActions({ event }: { event: EventDto }) {
  const queryClient = useQueryClient();
  const detailKey = eventQueryOptions(event.eventId).queryKey;

  const mutation = useMutation({
    mutationFn: (to: EventStatus) => changeEventStatus(event.eventId, event.status, to),
    onSuccess: (updated) => {
      queryClient.setQueryData(detailKey, updated);
      void queryClient.invalidateQueries({ queryKey: eventListsKey });
    },
    onError: (error) => {
      // Someone else changed it first: load the current status so the buttons match it.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: detailKey });
        void queryClient.invalidateQueries({ queryKey: eventListsKey });
      }
    },
  });

  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Change status" className="flex flex-wrap gap-2">
        {actionsFor[event.status].map((action) => (
          <Button
            key={action.to}
            variant={action.primary ? 'primary' : 'default'}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(action.to)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {conflict && (
        <p role="alert" className="text-warn">
          Someone else changed this event's status. Showing the latest.
        </p>
      )}
      {mutation.error && !conflict && <ErrorState error={mutation.error} />}
    </div>
  );
}
