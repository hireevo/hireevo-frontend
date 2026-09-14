import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadOrCreateProfile,
  publishProfile,
  saveIdentity,
  toPayload,
  type OwnProfile,
} from './api.ts';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

const profile = (overrides: Partial<OwnProfile> = {}) =>
  ({ id: 'p1', version: 3, ...overrides }) as OwnProfile;
const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const failed = (status: number, code = 'X', details?: unknown) => ({
  data: undefined,
  error: { error: { code, message: `failed with ${status}`, requestId: 'r', details } },
  response: { status },
});

beforeEach(() => {
  client.GET.mockReset();
  client.POST.mockReset();
  client.PATCH.mockReset();
});

describe('loadOrCreateProfile', () => {
  it('reads an existing profile and creates nothing', async () => {
    client.GET.mockResolvedValueOnce(ok(profile()));
    expect(await loadOrCreateProfile()).toEqual({ ok: true, profile: profile() });
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('creates the profile on first visit', async () => {
    client.GET.mockResolvedValueOnce(failed(404, 'NOT_FOUND'));
    client.POST.mockResolvedValueOnce(ok(profile({ version: 1 }), 201));
    expect(await loadOrCreateProfile()).toEqual({ ok: true, profile: profile({ version: 1 }) });
  });

  it('reads the profile a concurrent create already made', async () => {
    // Another tab — or React running the effect twice — got there first.
    client.GET.mockResolvedValueOnce(failed(404, 'NOT_FOUND'));
    client.POST.mockResolvedValueOnce(failed(409, 'CONFLICT'));
    client.GET.mockResolvedValueOnce(ok(profile()));
    expect(await loadOrCreateProfile()).toEqual({ ok: true, profile: profile() });
  });

  it('reports a failure it cannot recover from', async () => {
    client.GET.mockResolvedValueOnce(failed(500, 'INTERNAL_ERROR'));
    expect(await loadOrCreateProfile()).toEqual({ ok: false, message: 'failed with 500' });
  });

  it('says the API could not be reached when the request never arrives', async () => {
    client.GET.mockRejectedValueOnce(new TypeError('fetch failed'));
    const result = await loadOrCreateProfile();
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.message).toMatch(/could not reach/i);
  });
});

describe('saveIdentity', () => {
  const values = {
    displayName: '  Sophie Brandt ',
    headline: '',
    overview: 'Bio',
    availabilityNote: '   ',
  };

  it('sends the version it was editing, trimmed, with empty fields cleared', async () => {
    client.PATCH.mockResolvedValueOnce(ok(profile({ version: 4 })));
    await saveIdentity(3, values);
    expect(client.PATCH).toHaveBeenCalledWith('/api/v1/profiles/me', {
      body: {
        version: 3,
        profile: {
          displayName: 'Sophie Brandt',
          headline: null,
          overview: 'Bio',
          availabilityNote: null,
        },
      },
    });
  });

  it('reports a version conflict as a conflict, not a failure', async () => {
    client.PATCH.mockResolvedValueOnce(failed(409, 'VERSION_CONFLICT'));
    expect(await saveIdentity(3, values)).toMatchObject({ ok: false, kind: 'conflict' });
  });

  it('puts a rejected field’s message on that field', async () => {
    client.PATCH.mockResolvedValueOnce(
      failed(400, 'VALIDATION_FAILED', {
        issues: [{ path: 'profile.displayName', code: 'too_big', message: 'Too long' }],
      }),
    );
    const result = await saveIdentity(3, values);
    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid',
      fieldErrors: { displayName: 'Too long' },
    });
  });
});

describe('toPayload', () => {
  it('never sends whitespace as a value', () => {
    expect(
      toPayload({ displayName: ' ', headline: 'a', overview: '', availabilityNote: '' }),
    ).toEqual({
      displayName: null,
      headline: 'a',
      overview: null,
      availabilityNote: null,
    });
  });
});

describe('publishProfile', () => {
  it('lists what is missing, field by field', async () => {
    client.POST.mockResolvedValueOnce(
      failed(400, 'VALIDATION_FAILED', {
        issues: [
          {
            path: 'locationCountry',
            code: 'invalid_type',
            message: 'Choose the country you work from',
          },
          { path: 'availability', code: 'invalid_value', message: 'Set your availability' },
        ],
      }),
    );
    expect(await publishProfile()).toEqual({
      ok: false,
      kind: 'incomplete',
      issues: [
        { field: 'locationCountry', message: 'Choose the country you work from' },
        { field: 'availability', message: 'Set your availability' },
      ],
    });
  });

  it('returns the published profile', async () => {
    client.POST.mockResolvedValueOnce(ok(profile({ status: 'published' })));
    expect(await publishProfile()).toEqual({ ok: true, profile: profile({ status: 'published' }) });
  });
});
