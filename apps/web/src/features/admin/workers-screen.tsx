'use client';

import { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuSearch, LuUserSearch } from 'react-icons/lu';
import { Badge, Button, Dialog, cn } from '@hireevo/ui-web';
import {
  NO_FILTERS,
  PAGE_SIZE,
  countriesOf,
  filterWorkers,
  pageOf,
  statesOf,
  withCountry,
  type WorkerFilters,
} from './filter-workers.ts';
import type { AdminWorker } from './types.ts';

const CONTROL =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface px-3 text-sm text-content transition-colors focus:border-border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-focus disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-subtle';

/**
 * The workers list an administrator works in.
 *
 * Filtering happens as the panel is used rather than only when Search is
 * pressed — the rows are here, so making somebody press a button to see the
 * effect of the thing they just typed is a round trip invented for its own
 * sake. Search stays, because a form with a text field has to do something on
 * Enter, and Reset is the way back to everything.
 */
export function WorkersScreen({ workers }: { workers: readonly AdminWorker[] }) {
  const [filters, setFilters] = useState<WorkerFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [shown, setShown] = useState<AdminWorker | null>(null);

  const countries = useMemo(() => countriesOf(workers), [workers]);
  const states = useMemo(() => statesOf(workers, filters.country), [workers, filters.country]);
  const found = useMemo(() => filterWorkers(workers, filters), [workers, filters]);
  // Clamped rather than reset: narrowing a search while on page 3 should land
  // on the last page of what is left, not throw the reader back to the top.
  const current = pageOf(found, page);

  const change = (next: WorkerFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Search workers"
        className="rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5"
      >
        <form
          // Nothing is fetched, so the submit exists to catch Enter and to stop
          // the browser navigating away with the fields in the query string.
          onSubmit={(event) => event.preventDefault()}
          className="grid gap-4 *:min-w-0 md:grid-cols-3"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-muted">Worker name</span>
            <span className="relative flex items-center">
              <LuSearch
                aria-hidden="true"
                className="pointer-events-none absolute left-3 size-4 text-content-subtle"
              />
              <input
                type="search"
                value={filters.name}
                placeholder="Search by name"
                onChange={(event) => change({ ...filters, name: event.target.value })}
                className={cn(CONTROL, 'pl-9')}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-muted">Country</span>
            <select
              value={filters.country}
              onChange={(event) => change(withCountry(filters, event.target.value))}
              className={CONTROL}
            >
              <option value="">Every country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-muted">State</span>
            <select
              value={filters.state}
              disabled={filters.country === ''}
              onChange={(event) => change({ ...filters, state: event.target.value })}
              className={CONTROL}
            >
              <option value="">
                {filters.country === '' ? 'Choose a country first' : 'Every state'}
              </option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-3">
            <Button type="submit" size="md">
              Search
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => change(NO_FILTERS)}>
              Reset
            </Button>
            <p aria-live="polite" className="text-sm text-content-muted">
              {current.total === 0
                ? 'No workers match this search'
                : `Showing ${current.first}–${current.last} of ${current.total}`}
            </p>
          </div>
        </form>
      </section>

      <section
        aria-label="Workers"
        className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
      >
        {current.total === 0 ? (
          <EmptyState onReset={() => change(NO_FILTERS)} />
        ) : (
          <>
            <WorkerTable rows={current.rows} onOpen={setShown} />
            <WorkerCards rows={current.rows} onOpen={setShown} />
          </>
        )}
      </section>

      {current.pages > 1 ? (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-content-muted">
            Page {current.page} of {current.pages}
          </p>
          <span className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={current.page === 1}
              onClick={() => setPage(current.page - 1)}
            >
              <LuChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={current.page === current.pages}
              onClick={() => setPage(current.page + 1)}
            >
              Next
              <LuChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </span>
        </nav>
      ) : null}

      {shown === null ? null : <WorkerDetails worker={shown} onClose={() => setShown(null)} />}
    </div>
  );
}

/** Both statuses as words first: nothing here depends on seeing a colour. */
function StatusBadge({ worker }: { worker: AdminWorker }) {
  return worker.status === 'completed' ? (
    <Badge tone="success">Profile complete</Badge>
  ) : (
    <Badge tone="warning">Profile incomplete</Badge>
  );
}

function FlagBadge({ worker }: { worker: AdminWorker }) {
  return worker.flag === 'flagged' ? (
    <Badge tone="warning" variant="solid">
      Flagged
    </Badge>
  ) : (
    <Badge tone="neutral">Not flagged</Badge>
  );
}

/**
 * The table, from the medium breakpoint up.
 *
 * A real `table`, so a screen reader announces which column a cell is in and
 * the header row is read once rather than repeated into every line. Below `xl`
 * it is hidden and the cards below take over: a six-column table on anything
 * narrower either scrolls the page sideways or shrinks its text under twelve
 * pixels, and §6.11 rules out both.
 */
function WorkerTable({
  rows,
  onOpen,
}: {
  rows: readonly AdminWorker[];
  onOpen: (worker: AdminWorker) => void;
}) {
  return (
    // `xl`, not `md`: six columns with two lines of text in several of them
    // need about a thousand pixels, and the sidebar takes 256 of whatever the
    // window has from `lg` up. At 768 and at 1024 the table pushed the whole
    // page into a sideways scroll with the Details column off the edge. The
    // horizontal scroll here is the second line of defence, for a name longer
    // than any of these.
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-subtle">
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              ID
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Worker
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Location
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Profile
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Moderation
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-content-muted">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((worker) => (
            <tr
              key={worker.id}
              className="border-b border-border-subtle last:border-0 hover:bg-surface-subtle"
            >
              <td className="px-4 py-3 align-top text-content-subtle tabular-nums">{worker.id}</td>
              <td className="max-w-[20rem] px-4 py-3 align-top">
                <span className="block truncate font-medium text-content-accent">
                  {worker.name}
                </span>
                <span className="block truncate text-xs text-content-subtle">{worker.email}</span>
              </td>
              <td className="px-4 py-3 align-top text-content-muted">
                <span className="block">{worker.country}</span>
                <span className="block text-xs text-content-subtle">{worker.state ?? '—'}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge worker={worker} />
              </td>
              <td className="px-4 py-3 align-top">
                <FlagBadge worker={worker} />
              </td>
              <td className="px-4 py-3 text-right align-top">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpen(worker)}>
                  Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The same rows as cards, which is what a phone gets instead of a wide table. */
function WorkerCards({
  rows,
  onOpen,
}: {
  rows: readonly AdminWorker[];
  onOpen: (worker: AdminWorker) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border-subtle xl:hidden">
      {rows.map((worker) => (
        <li key={worker.id} className="flex flex-col gap-3 p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-content-accent">
                {worker.name}
              </span>
              <span className="block truncate text-xs text-content-subtle">{worker.email}</span>
            </span>
            <span className="shrink-0 text-xs text-content-subtle tabular-nums">#{worker.id}</span>
          </div>
          <p className="text-sm text-content-muted">
            {worker.state === null ? worker.country : `${worker.state}, ${worker.country}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge worker={worker} />
            <FlagBadge worker={worker} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpen(worker)}>
            Details
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * What a search that matched nothing says.
 *
 * With the way out in it: the reader's own filters are the reason the table is
 * empty, and an empty table with no explanation reads as a broken page.
 */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle">
        <LuUserSearch aria-hidden="true" className="size-5 text-content-subtle" />
      </span>
      <p className="text-base font-semibold text-content-accent">No workers match this search</p>
      <p className="max-w-sm text-sm text-content-muted">
        Try a shorter name, or clear the filters to see everybody again.
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={onReset}>
        Clear filters
      </Button>
    </div>
  );
}

/** One worker in full, in the box the Details button opens. */
function WorkerDetails({ worker, onClose }: { worker: AdminWorker; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Worker ID', String(worker.id)],
    ['Email', worker.email],
    ['Country', worker.country],
    ['State', worker.state ?? 'None recorded'],
    ['Joined', worker.joinedOn],
  ];

  return (
    <Dialog
      title={worker.name}
      description="Everything recorded about this account."
      onClose={onClose}
    >
      <dl className="flex flex-col divide-y divide-border-subtle">
        {rows.map(([term, value]) => (
          <div
            key={term}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5"
          >
            <dt className="text-sm text-content-subtle">{term}</dt>
            <dd className="min-w-0 text-sm break-words text-content">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge worker={worker} />
        <FlagBadge worker={worker} />
      </div>
    </Dialog>
  );
}

export { PAGE_SIZE };
