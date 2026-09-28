import { beforeEach, describe, expect, it } from 'vitest';
import type { DraftFile } from '@/features/media/upload.ts';
import { EMPTY_VALUES } from '@/features/profile-setup/api.ts';
import { readDraft, writeDraft } from './client-profile-draft.ts';

const file = (over: Partial<DraftFile>): DraftFile => ({
  kind: 'image',
  objectKey: 'profiles/p/portfolio/one.webp',
  contentType: 'image/webp',
  byteSize: 1024,
  ...over,
});

const contents = (files: DraftFile[]) => ({
  profileVersion: 7,
  identity: EMPTY_VALUES,
  country: '',
  languages: [],
  skills: [],
  experience: [],
  education: [],
  licenses: [{ key: 'c1', values: { name: 'Accessibility' }, files }],
  portfolio: [{ id: 'p1', fields: { title: 'Checkout' }, files }],
  rates: [],
});

describe('what the client profile draft keeps about a file', () => {
  beforeEach(() => window.localStorage.clear());

  it('does not keep a preview that dies with the page', () => {
    // A file chosen a moment ago shows from a `blob:` address belonging to this
    // document. Keeping it meant that on the next visit the piece had its
    // pictures and every one of them was an empty tile.
    writeDraft('user-1', contents([file({ url: 'blob:http://x/1', thumbUrl: 'blob:http://x/2' })]));

    const kept = readDraft('user-1');
    expect(kept?.portfolio[0]?.files?.[0]).not.toHaveProperty('url');
    expect(kept?.portfolio[0]?.files?.[0]).not.toHaveProperty('thumbUrl');
    // The file itself is still attached — it is in storage, and the profile
    // knows where. Only the dead address is dropped.
    expect(kept?.portfolio[0]?.files?.[0]?.objectKey).toBe('profiles/p/portfolio/one.webp');
    expect(kept?.licenses[0]?.files?.[0]).not.toHaveProperty('thumbUrl');
  });

  it('keeps an address that will still work', () => {
    writeDraft(
      'user-1',
      contents([
        file({
          url: 'https://media.example.com/full.webp',
          thumbUrl: 'https://media.example.com/t.webp',
        }),
      ]),
    );

    expect(readDraft('user-1')?.portfolio[0]?.files?.[0]).toMatchObject({
      url: 'https://media.example.com/full.webp',
      thumbUrl: 'https://media.example.com/t.webp',
    });
  });
});
