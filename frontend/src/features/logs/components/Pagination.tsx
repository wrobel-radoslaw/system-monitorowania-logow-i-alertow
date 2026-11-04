import { Button } from '@/shared/ui/Button';

type PaginationProps = {
  page: number;
  totalPages: number;
  shownCount: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  totalPages,
  shownCount,
  totalCount,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
      <p>
        Showing {shownCount} of {totalCount} entries · auto-refresh every 5 s
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-3">
        <Button
          disabled={page <= 1}
          // A URL can point past the last page, so "Previous" returns to the last real one.
          onClick={() => onPageChange(Math.min(page - 1, totalPages))}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </nav>
    </div>
  );
}
