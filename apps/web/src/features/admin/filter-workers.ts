import type { AdminWorker } from './types.ts';

/** What the search panel above the table is asking for. */
export interface WorkerFilters {
  name: string;
  country: string;
  state: string;
}

export const NO_FILTERS: WorkerFilters = { name: '', country: '', state: '' };

/** Every country present in the list, named once and in alphabetical order. */
export function countriesOf(workers: readonly AdminWorker[]): string[] {
  return [...new Set(workers.map((worker) => worker.country))].sort((a, b) => a.localeCompare(b));
}

/**
 * The states of one country, which is why the control beside it stays empty
 * until a country is chosen: a flat list of every state on the platform is
 * where "Georgia" appears twice and means two different things.
 */
export function statesOf(workers: readonly AdminWorker[], country: string): string[] {
  if (country === '') return [];
  return [
    ...new Set(
      workers
        .filter((worker) => worker.country === country)
        .map((worker) => worker.state)
        .filter((state): state is string => state !== null),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/**
 * The rows a search asks for.
 *
 * The name matches on any part of it, case-insensitively and with the edges
 * trimmed, because an administrator searching for somebody types the half of
 * the name they remember — an exact match would answer "no such worker" for a
 * worker who is right there.
 */
export function filterWorkers(
  workers: readonly AdminWorker[],
  filters: WorkerFilters,
): AdminWorker[] {
  const name = filters.name.trim().toLowerCase();

  return workers.filter((worker) => {
    if (name !== '' && !worker.name.toLowerCase().includes(name)) return false;
    if (filters.country !== '' && worker.country !== filters.country) return false;
    if (filters.state !== '' && worker.state !== filters.state) return false;
    return true;
  });
}

/**
 * A state chosen under one country cannot survive a move to another.
 *
 * Without this the panel reads "United States / Ontario" and answers with
 * nothing, which looks like an empty database rather than a contradiction.
 */
export function withCountry(filters: WorkerFilters, country: string): WorkerFilters {
  return country === filters.country ? filters : { ...filters, country, state: '' };
}

/** How many rows one page of the table holds. */
export const PAGE_SIZE = 10;

export interface Page<T> {
  rows: T[];
  /** 1-based, and clamped: deleting the last row must not strand anyone on page 4. */
  page: number;
  pages: number;
  total: number;
  first: number;
  last: number;
}

export function pageOf<T>(rows: readonly T[], wanted: number, size = PAGE_SIZE): Page<T> {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(Math.max(1, wanted), pages);
  const start = (page - 1) * size;

  return {
    rows: rows.slice(start, start + size),
    page,
    pages,
    total: rows.length,
    first: rows.length === 0 ? 0 : start + 1,
    last: Math.min(start + size, rows.length),
  };
}
