import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_VALUES,
  listSkills,
  loadOrCreateProfile,
  publishProfile,
  saveProfile,
  saveVisibility,
  toPayload,
  uploadAvatar,
  type OwnProfile,
} from './api.ts';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

/** What the last save sent, named rather than reached for through an untyped mock. */
type PatchBody = {
  version: number;
  profile: Record<string, string | null | undefined>;
  sections?: Record<string, unknown>;
};
const lastPatch = (): PatchBody =>
  (client.PATCH.mock.calls.at(-1) as [string, { body: PatchBody }])[1].body;

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
  client.PUT.mockReset();
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

describe('saveProfile', () => {
  const values = {
    ...EMPTY_VALUES,
    displayName: '  Sophie Brandt ',
    overview: 'Bio',
    availabilityNote: '   ',
  };

  it('sends the version it was editing, trimmed, with empty fields cleared', async () => {
    client.PATCH.mockResolvedValueOnce(ok(profile({ version: 4 })));
    await saveProfile(3, values);
    expect(client.PATCH).toHaveBeenCalledWith('/api/v1/profiles/me', {
      body: {
        version: 3,
        profile: {
          displayName: 'Sophie Brandt',
          headline: null,
          overview: 'Bio',
          availabilityNote: null,
          locationCountry: null,
          locationRegion: null,
          locationCity: null,
          serviceArea: null,
          timezone: null,
          remoteMode: null,
          rateAmountMinor: null,
          rateCurrency: null,
        },
      },
    });
  });

  it('sends the lists in the same request as the fields, at the same version', async () => {
    client.PATCH.mockResolvedValueOnce(ok(profile({ version: 4 })));
    await saveProfile(3, values, { skills: [{ name: 'Figma', proficiency: 'expert', years: 7 }] });

    expect(lastPatch().version).toBe(3);
    expect(lastPatch().sections).toEqual({
      skills: [{ name: 'Figma', proficiency: 'expert', years: 7 }],
    });
  });

  it('claims a photo only when one was just uploaded', async () => {
    client.PATCH.mockResolvedValue(ok(profile({ version: 4 })));

    await saveProfile(3, values);
    expect(lastPatch().profile).not.toHaveProperty('avatarKey');

    await saveProfile(3, { ...values, avatarKey: 'avatars/p1/abc.png' });
    expect(lastPatch().profile.avatarKey).toBe('avatars/p1/abc.png');
  });

  it('reports a version conflict as a conflict, not a failure', async () => {
    client.PATCH.mockResolvedValueOnce(failed(409, 'VERSION_CONFLICT'));
    expect(await saveProfile(3, values)).toMatchObject({ ok: false, kind: 'conflict' });
  });

  it('puts a rejected field’s message on that field', async () => {
    client.PATCH.mockResolvedValueOnce(
      failed(400, 'VALIDATION_FAILED', {
        issues: [{ path: 'profile.displayName', code: 'too_big', message: 'Too long' }],
      }),
    );
    const result = await saveProfile(3, values);
    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid',
      fieldErrors: { displayName: 'Too long' },
    });
  });
});

describe('toPayload', () => {
  it('never sends whitespace as a value', () => {
    expect(toPayload({ ...EMPTY_VALUES, displayName: ' ', headline: 'a' })).toMatchObject({
      displayName: null,
      headline: 'a',
      overview: null,
      availabilityNote: null,
    });
  });
});

describe('saveVisibility', () => {
  const settings = {
    version: 3,
    profilePublic: true,
    locationGranularity: 'country' as const,
    sections: {
      nameHeadline: true,
      biography: false,
      location: false,
      languages: false,
      rate: false,
      skills: false,
      experience: false,
      education: false,
      licenses: false,
      availability: false,
    },
    searchIndexable: false,
  };

  it('sends the whole setting at the profile’s version', async () => {
    client.PUT.mockResolvedValueOnce(ok({ ...settings }));
    expect(await saveVisibility(settings)).toMatchObject({ ok: true });
    expect(client.PUT).toHaveBeenCalledWith('/api/v1/profiles/me/visibility', { body: settings });
  });

  it('reports a version conflict as a conflict', async () => {
    client.PUT.mockResolvedValueOnce(failed(409, 'VERSION_CONFLICT'));
    expect(await saveVisibility(settings)).toMatchObject({ ok: false, kind: 'conflict' });
  });
});

describe('uploadAvatar', () => {
  const ticket = {
    url: 'https://storage.example/hireevo',
    fields: { key: 'avatars/p1/abc.png', policy: 'p', 'x-amz-signature': 's' },
    key: 'avatars/p1/abc.png',
    expiresAt: '2026-09-16T10:00:00Z',
    maxBytes: 5_000_000,
  };
  const file = (type = 'image/png', size = 1000) =>
    Object.defineProperty(new File(['x'], 'photo.png', { type }), 'size', { value: size });

  it('sends the bytes to storage, not through the API, and answers with the key to claim', async () => {
    client.POST.mockResolvedValueOnce(ok(ticket));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    expect(await uploadAvatar(file())).toEqual({ ok: true, key: ticket.key });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ticket.url);
    const sent = init.body as FormData;
    // The signed fields come before the file, which is what S3-compatible
    // storage requires of a pre-signed post.
    expect([...sent.keys()]).toEqual(['key', 'policy', 'x-amz-signature', 'file']);

    vi.unstubAllGlobals();
  });

  it('refuses a file the profile cannot store, before asking for a ticket', async () => {
    expect(await uploadAvatar(file('image/gif'))).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses a file over the size the ticket allows', async () => {
    client.POST.mockResolvedValueOnce(ok(ticket));
    const result = await uploadAvatar(file('image/png', 6_000_000));
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toMatch(/5MB/);
  });

  it('says the photo was not stored when storage refuses it', async () => {
    client.POST.mockResolvedValueOnce(ok(ticket));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    expect(await uploadAvatar(file())).toMatchObject({ ok: false });
    vi.unstubAllGlobals();
  });
});

describe('listSkills', () => {
  it('asks for what is being typed', async () => {
    client.GET.mockResolvedValueOnce(
      ok({ skills: [{ slug: 'figma', name: 'Figma', category: null }] }),
    );
    expect(await listSkills('fig')).toEqual([{ slug: 'figma', name: 'Figma', category: null }]);
    expect(client.GET).toHaveBeenCalledWith('/api/v1/skills', {
      params: { query: { query: 'fig' } },
    });
  });

  it('answers with nothing rather than failing a screen that only suggests', async () => {
    client.GET.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await listSkills('fig')).toEqual([]);
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
