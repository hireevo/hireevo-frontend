import { describe, expect, it } from 'vitest';
import {
  NO_FILTERS,
  countriesOf,
  filterWorkers,
  pageOf,
  statesOf,
  withCountry,
} from './filter-workers.ts';
import { SAMPLE_WORKERS } from './sample-workers.ts';
import type { AdminWorker } from './types.ts';

const worker = (over: Partial<AdminWorker>): AdminWorker => ({
  id: 1,
  name: 'Marcus Delgado',
  email: 'marcus@example.com',
  country: 'United States',
  state: 'California',
  status: 'completed',
  account: 'active',
  joinedOn: '2026-01-01',
  ...over,
});

describe('searching the workers list', () => {
  it('matches any part of a name, whatever the case and the spacing', () => {
    const rows = [worker({ id: 1 }), worker({ id: 2, name: 'Amara Nwosu' })];

    // What somebody types is the half of the name they remember.
    expect(filterWorkers(rows, { ...NO_FILTERS, name: 'delgado' }).map((r) => r.id)).toEqual([1]);
    expect(filterWorkers(rows, { ...NO_FILTERS, name: '  NWOSU ' }).map((r) => r.id)).toEqual([2]);
    expect(filterWorkers(rows, { ...NO_FILTERS, name: 'a' }).map((r) => r.id)).toEqual([1, 2]);
  });

  it('narrows by country and by state together', () => {
    const rows = [
      worker({ id: 1, country: 'United States', state: 'California' }),
      worker({ id: 2, country: 'United States', state: 'Texas' }),
      worker({ id: 3, country: 'Canada', state: 'Ontario' }),
    ];

    expect(
      filterWorkers(rows, { ...NO_FILTERS, country: 'United States' }).map((r) => r.id),
    ).toEqual([1, 2]);
    expect(
      filterWorkers(rows, { ...NO_FILTERS, country: 'United States', state: 'Texas' }).map(
        (r) => r.id,
      ),
    ).toEqual([2]);
  });

  it('offers the states of the chosen country and nothing else', () => {
    // A flat list of every state on the platform is where "Georgia" appears
    // twice and means two different things.
    expect(statesOf(SAMPLE_WORKERS, '')).toEqual([]);
    expect(statesOf(SAMPLE_WORKERS, 'Canada')).toEqual([
      'Alberta',
      'British Columbia',
      'Ontario',
      'Quebec',
    ]);
    // A country whose rows carry no state offers none rather than an empty
    // string masquerading as one.
    expect(statesOf(SAMPLE_WORKERS, 'Singapore')).toEqual([]);
  });

  it('names every country once, in order', () => {
    expect(countriesOf(SAMPLE_WORKERS)).toEqual(['Canada', 'Singapore', 'United States']);
  });

  /**
   * A state chosen under one country cannot survive a move to another.
   *
   * Without this the panel reads "United States / Ontario" and answers with
   * nothing, which looks like an empty database rather than a contradiction.
   */
  it('drops the state when the country changes, and keeps it when it does not', () => {
    const chosen = { name: 'a', country: 'Canada', state: 'Ontario' };

    expect(withCountry(chosen, 'United States')).toEqual({
      name: 'a',
      country: 'United States',
      state: '',
    });
    expect(withCountry(chosen, 'Canada')).toEqual(chosen);
  });
});

describe('paging the results', () => {
  const rows = Array.from({ length: 16 }, (_, index) => worker({ id: index + 1 }));

  it('counts from one and says what is on screen', () => {
    const first = pageOf(rows, 1);
    expect(first.rows).toHaveLength(10);
    expect([first.first, first.last, first.total, first.pages]).toEqual([1, 10, 16, 2]);

    const second = pageOf(rows, 2);
    expect(second.rows).toHaveLength(6);
    expect([second.first, second.last]).toEqual([11, 16]);
  });

  /**
   * Narrowing a search while on page 3 lands on the last page of what is left.
   *
   * Left unclamped the reader gets an empty table with rows they can see the
   * count of, which reads as a broken page rather than as a search that matched
   * less than it did a moment ago.
   */
  it('clamps a page that no longer exists', () => {
    expect(pageOf(rows.slice(0, 4), 3).page).toBe(1);
    expect(pageOf(rows, 99).page).toBe(2);
    expect(pageOf([], 1)).toMatchObject({ page: 1, pages: 1, total: 0, first: 0, last: 0 });
  });
});
