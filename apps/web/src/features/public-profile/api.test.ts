import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicProfile } from './api.ts';

const client = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@hireevo/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createApiClient: () => client,
}));

const answer = (status: number, data?: unknown) => ({
  data,
  error: undefined,
  response: { status },
});

beforeEach(() => {
  client.GET.mockReset();
});

describe('fetchPublicProfile', () => {
  it('asks for the slug it was given', async () => {
    client.GET.mockResolvedValue(answer(200, { slug: 'abc' }));

    expect(await fetchPublicProfile('abc')).toEqual({ slug: 'abc' });
    expect(client.GET).toHaveBeenCalledWith('/api/v1/profiles/{slug}', {
      params: { path: { slug: 'abc' } },
    });
  });

  it('answers with nothing for a profile that is not there', async () => {
    // A draft, a suspended profile, one switched back to private and a slug
    // that never existed all arrive as 404, which is how the API keeps a slug
    // from being used to tell them apart.
    client.GET.mockResolvedValue(answer(404));

    expect(await fetchPublicProfile('missing')).toBeNull();
  });

  it('throws on anything else, so a broken API is not shown as a missing page', async () => {
    client.GET.mockResolvedValue(answer(500));

    await expect(fetchPublicProfile('abc')).rejects.toThrow(/could not be loaded/);
  });
});
