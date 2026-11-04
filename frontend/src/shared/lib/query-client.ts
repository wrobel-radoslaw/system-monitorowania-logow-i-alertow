import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx answer will not change on retry (bad filters, unknown event).
        retry: (failureCount, error) =>
          failureCount < 1 && !(error instanceof ApiError && error.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
