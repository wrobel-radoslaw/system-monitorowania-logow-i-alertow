type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = 'No data yet' }: EmptyStateProps) {
  return <p className="text-text-muted">{message}</p>;
}
