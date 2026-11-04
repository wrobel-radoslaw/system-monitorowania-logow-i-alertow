import { getErrorMessage } from '@/shared/lib/api-client';

type ErrorStateProps = {
  error: unknown;
};

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <p role="alert" className="text-danger">
      {getErrorMessage(error)}
    </p>
  );
}
