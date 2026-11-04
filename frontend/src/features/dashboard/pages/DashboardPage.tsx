import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <EmptyState />
    </>
  );
}
