import { Spinner } from './Spinner';

/** Spinner plus text. The wrapper is the one live region, so the icon stays silent. */
export function Loading() {
  return (
    <p role="status" className="flex items-center gap-2 text-muted">
      <Spinner role="presentation" aria-hidden="true" />
      Loading...
    </p>
  );
}
