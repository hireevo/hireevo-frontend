'use client';

import { useMemo, useState } from 'react';
import {
  NO_FILTERS,
  PAGE_SIZE,
  countriesOf,
  filterWorkers,
  pageOf,
  statesOf,
  type WorkerFilters,
} from './filter-workers.ts';
import { AdminIdentity } from './admin-account.tsx';
import { SAMPLE_WORKERS } from './sample-workers.ts';
import { WorkersScreen } from './workers-screen.tsx';
import type { AdminWorker } from './types.ts';

/**
 * The same screen over a fixture, with no session and no server.
 *
 * This is what `/design-system/admin` renders and what the resolution sweep
 * measures: the sweep cannot sign in, and a layout suite that has to reach a
 * database is a layout suite that fails for reasons about the database. The
 * filtering, paging and banning here are the fixture's own — real behaviour
 * over sample data, which is what §1.6 allows a fixture to be — and the notice
 * says so, because a row that changes on screen and nowhere else would
 * otherwise read as a change that was saved.
 */
export function WorkersPreview() {
  const [rows, setRows] = useState<readonly AdminWorker[]>(SAMPLE_WORKERS);
  const [filters, setFilters] = useState<WorkerFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [said, setSaid] = useState('');

  const found = useMemo(() => filterWorkers(rows, filters), [rows, filters]);
  const current = pageOf(found, page);

  const places = useMemo(
    () => countriesOf(rows).map((country) => ({ country, regions: statesOf(rows, country) })),
    [rows],
  );

  const setAccount = (worker: AdminWorker, account: AdminWorker['account']) => {
    setRows((all) => all.map((row) => (row.id === worker.id ? { ...row, account } : row)));
    setSaid(
      account === 'banned'
        ? `${worker.name} is banned and can no longer sign in.`
        : `${worker.name} can sign in again.`,
    );
  };

  /** Over the fixture, approving copies the name across and closes the request. */
  const decideName = (worker: AdminWorker, decision: 'approved' | 'rejected') => {
    const wanted = worker.nameChange?.wanted ?? worker.name;
    setRows((all) =>
      all.map((row) =>
        row.id === worker.id
          ? { ...row, name: decision === 'approved' ? wanted : row.name, nameChange: null }
          : row,
      ),
    );
    setSaid(
      decision === 'approved'
        ? `${worker.name} is now shown as ${wanted}.`
        : `The name change for ${worker.name} was refused.`,
    );
  };

  return (
    <WorkersScreen
      workers={current.rows}
      total={current.total}
      page={current.page}
      pageSize={PAGE_SIZE}
      places={places}
      busy={false}
      problem={null}
      said={said}
      notice="This preview runs on sample data — nothing here reaches an account, and nothing is saved."
      onQuery={(next, nextPage) => {
        setFilters(next);
        setPage(nextPage);
      }}
      onBan={(worker) => setAccount(worker, 'banned')}
      onUnban={(worker) => setAccount(worker, 'active')}
      onApproveName={(worker) => decideName(worker, 'approved')}
      onRejectName={(worker) => decideName(worker, 'rejected')}
    />
  );
}

/**
 * The console's account block, for a page with no session.
 *
 * A client component rather than the arrow function the preview page used to
 * pass down: that page is rendered on the server, and a server component
 * handing a function to a client one builds fine and throws at request time
 * with "Event handlers cannot be passed to Client Component props" — which
 * `next dev` tolerates and the shipped artifact does not (§1.3). The no-op
 * belongs on this side of the boundary.
 *
 * It is a working disclosure over sample data, as the rest of this page is, so
 * the sweep can measure the panel open. The banner above already says nothing
 * here reaches an account.
 */
export function AdminIdentityPreview() {
  return (
    <AdminIdentity
      name="Husnain Raza"
      role="Administrator"
      email="husnain.raza@example.com"
      onSignOut={() => undefined}
    />
  );
}
