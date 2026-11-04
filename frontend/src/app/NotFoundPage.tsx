import { Link } from 'react-router';
import { PageHeader } from '@/shared/ui/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p className="mb-4 text-text-muted">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="text-text-muted underline hover:text-text-primary">
        Go to Dashboard
      </Link>
    </>
  );
}
