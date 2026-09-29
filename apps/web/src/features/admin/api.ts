import { toApiError, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import type { AdminWorker } from './types.ts';

/** One page of workers, exactly as the API answers. */
export type WorkerPage = Schema<'AdminWorkerPage'>;

/** What the console asks for. Everything is optional; the API holds the defaults. */
export interface WorkerRequest {
  search?: string;
  country?: string;
  region?: string;
  page: number;
  pageSize: number;
}

/**
 * What every call here answers with.
 *
 * A result rather than an exception: the screen has to say something different
 * for each of these, and a `catch` that cannot tell a conflict from an outage
 * ends up saying "something went wrong" to both.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'conflict' | 'gone' | 'denied' | 'failed'; message: string };

const UNREACHABLE = 'The server could not be reached. Check your connection and try again.';

export interface WorkerList {
  workers: AdminWorker[];
  total: number;
  page: number;
  pageSize: number;
  places: WorkerPage['places'];
}

/**
 * The list, mapped into what the screen holds.
 *
 * `banned` becomes the account state the table reads and `profileComplete` the
 * profile one, so the components stay unaware of which endpoint they came from
 * — which is what let them be built, swept and reviewed before this existed.
 */
export async function listWorkers(request: WorkerRequest): Promise<Result<WorkerList>> {
  try {
    const { data, error, response } = await api.GET('/api/v1/admin/workers', {
      params: {
        query: {
          page: request.page,
          pageSize: request.pageSize,
          ...(request.search === undefined || request.search === ''
            ? {}
            : { search: request.search }),
          ...(request.country === undefined || request.country === ''
            ? {}
            : { country: request.country }),
          ...(request.region === undefined || request.region === ''
            ? {}
            : { region: request.region }),
        },
      },
    });

    if (data !== undefined) {
      return {
        ok: true,
        value: {
          workers: data.workers.map(toWorker),
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          places: data.places,
        },
      };
    }

    return { ok: false, ...failure(response.status, error) };
  } catch {
    return { ok: false, kind: 'failed', message: UNREACHABLE };
  }
}

export const banWorker = (userId: string): Promise<Result<void>> => move(userId, 'ban');
export const unbanWorker = (userId: string): Promise<Result<void>> => move(userId, 'unban');

async function move(userId: string, action: 'ban' | 'unban'): Promise<Result<void>> {
  try {
    const { error, response } =
      action === 'ban'
        ? await api.POST('/api/v1/admin/workers/{userId}/ban', {
            params: { path: { userId } },
          })
        : await api.POST('/api/v1/admin/workers/{userId}/unban', {
            params: { path: { userId } },
          });

    // 204 carries no body, so the status is the whole answer.
    if (response.ok) return { ok: true, value: undefined };

    return { ok: false, ...failure(response.status, error) };
  } catch {
    return { ok: false, kind: 'failed', message: UNREACHABLE };
  }
}

/**
 * What each refusal means to somebody looking at a list.
 *
 * A 409 is the row having moved since it was drawn — somebody else acted, or
 * this administrator pressed twice — and the way out is to look again, so it
 * says that rather than repeating the API's sentence.
 */
function failure(
  status: number,
  error: unknown,
): { kind: 'conflict' | 'gone' | 'denied' | 'failed'; message: string } {
  if (status === 409) {
    return {
      kind: 'conflict',
      message: 'That account has already changed. Refresh the list to see where it stands.',
    };
  }
  if (status === 404) {
    return { kind: 'gone', message: 'That worker is no longer here.' };
  }
  if (status === 401 || status === 403) {
    return { kind: 'denied', message: 'You do not have access to do that.' };
  }

  return { kind: 'failed', message: toApiError(error)?.message ?? UNREACHABLE };
}

function toWorker(row: WorkerPage['workers'][number]): AdminWorker {
  return {
    id: row.userId,
    name: row.name ?? 'No name yet',
    email: row.email,
    country: row.country ?? 'Not given',
    // The contract says `region`, this screen says `state`: the API has to
    // cover provinces and prefectures, and the screen is written for the
    // administrators reading it.
    state: row.region,
    status: row.profileComplete ? 'completed' : 'not_completed',
    account: row.banned ? 'banned' : 'active',
    joinedOn: row.joinedOn.slice(0, 10),
  };
}
