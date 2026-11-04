import { EVENT_STATUSES, MACHINE_IDS } from '@/shared/types/events';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { FilterValues } from '../filters';

type SelectFilterProps = {
  label: string;
  allLabel: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

function SelectFilter({ label, allLabel, value, options, onChange }: SelectFilterProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-border bg-bg px-3 text-[15px] text-text"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type DateFilterProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateFilter({ label, value, onChange }: DateFilterProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type EventFiltersProps = {
  filters: FilterValues;
  onChange: (name: keyof FilterValues, value: string) => void;
  onClear: () => void;
};

/** The filters behind the "More filters" pill. Search and level sit above the table. */
export function EventFilters({ filters, onChange, onClear }: EventFiltersProps) {
  return (
    <form
      aria-label="More event filters"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-4"
    >
      <SelectFilter
        label="Machine"
        allLabel="All machines"
        value={filters.machineId}
        options={MACHINE_IDS}
        onChange={(value) => onChange('machineId', value)}
      />
      <SelectFilter
        label="Status"
        allLabel="All statuses"
        value={filters.status}
        options={EVENT_STATUSES}
        onChange={(value) => onChange('status', value)}
      />
      <DateFilter label="From" value={filters.from} onChange={(value) => onChange('from', value)} />
      <DateFilter label="To" value={filters.to} onChange={(value) => onChange('to', value)} />
      <Button onClick={onClear}>Clear filters</Button>
    </form>
  );
}
