'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';
import { banWorker, listWorkers, unbanWorker, type WorkerList } from './api.ts';
import { PAGE_SIZE, type WorkerFilters } from './filter-workers.ts';
import { WorkersScreen } from './workers-screen.tsx';

/**
 * The worker list, from the API.
 *
 * Separate from `WorkersScreen`, which draws it: the screen was built, swept
 * and reviewed against a fixture before these endpoints existed, and keeping
 * the two apart is what let that happen — and what keeps `/design-system/admin`
 * able to render the same screen with no session and no server.
 *
 * Filtering and paging are the API's, not this page's. A search that only
 * looked inside the twenty rows it had already fetched would answer "no such
 * worker" for a worker who is on page four.
 */
export function WorkersPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [list, setList] = useState<WorkerList | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // What the last request asked for, so a reload after a ban asks for the same
  // page rather than throwing the reader back to the first one.
  const asked = useRef<{ filters: WorkerFilters; page: number }>({
    filters: { name: '', country: '', state: '' },
    page: 1,
  });

  const load = useCallback(
    async (filters: WorkerFilters, page: number) => {
      asked.current = { filters, page };
      setProblem(null);

      const result = await listWorkers({
        search: filters.name,
        country: filters.country,
        region: filters.state,
        page,
        pageSize: PAGE_SIZE,
      });

      // Another request went out while this one was in flight; the later answer
      // is the one the reader is waiting for.
      if (asked.current.filters !== filters || asked.current.page !== page) return;

      if (result.ok) {
        setList(result.value);
        setState('ready');
        return;
      }

      setProblem(result.message);
      setState(list === null ? 'failed' : 'ready');
    },
    [list],
  );

  // Once per page load, not twice: StrictMode mounts an effect, tears it down
  // and mounts it again, and two identical requests for the first page is the
  // thing §6.5 asks anyone to check the network panel for.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void load({ name: '', country: '', state: '' }, 1);
    // Only on open. Everything after this is a filter or a page somebody asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (userId: string, action: 'ban' | 'unban') => {
    setActing(true);
    const result = action === 'ban' ? await banWorker(userId) : await unbanWorker(userId);
    setActing(false);

    if (!result.ok) {
      setProblem(result.message);
      // A refusal means the row is not what the screen is showing — a conflict
      // is somebody else having acted — so the list is read again either way.
      await load(asked.current.filters, asked.current.page);
      return;
    }

    await load(asked.current.filters, asked.current.page);
  };

  if (state === 'loading') {
    return (
      <p
        role="status"
        className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-content-subtle"
      >
        Loading the worker list…
      </p>
    );
  }

  if (state === 'failed' || list === null) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-10 text-center">
        <LuTriangleAlert aria-hidden="true" className="size-6 text-content-warning" />
        <p className="text-sm text-content">{problem ?? 'The worker list could not be loaded.'}</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void load(asked.current.filters, asked.current.page)}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <WorkersScreen
      workers={list.workers}
      total={list.total}
      page={list.page}
      pageSize={list.pageSize}
      places={list.places}
      busy={acting}
      problem={problem}
      onQuery={(filters, page) => void load(filters, page)}
      onBan={(worker) => void act(worker.id, 'ban')}
      onUnban={(worker) => void act(worker.id, 'unban')}
    />
  );
}
