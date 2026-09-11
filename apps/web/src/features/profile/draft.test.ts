import { describe, expect, it } from 'vitest';
import { completionOf, EMPTY_DRAFT, KEY_STEPS, type ProfileDraft } from './draft.ts';

const withLanguage: ProfileDraft = {
  ...EMPTY_DRAFT,
  languages: [{ name: 'English', proficiency: 'Conversational' }],
};

describe('completionOf', () => {
  it('counts an untouched profile as nothing', () => {
    expect(completionOf(EMPTY_DRAFT)).toEqual({ done: 0, total: 5, percent: 0 });
  });

  it('matches the state the design draws', () => {
    // The frame shows one language, nothing else, "1 of 5 key steps" and
    // "20% complete". If those three ever disagree, this is where it shows.
    expect(completionOf(withLanguage)).toEqual({ done: 1, total: 5, percent: 20 });
  });

  it('needs both halves of a name before the identity step counts', () => {
    const named = { ...withLanguage, displayName: 'Ayesha Khan' };
    expect(completionOf(named).done).toBe(1);
    expect(completionOf({ ...named, title: 'Product Designer' }).done).toBe(2);
  });

  it('does not count whitespace as an answer', () => {
    expect(completionOf({ ...withLanguage, about: '   \n ' }).done).toBe(1);
    expect(completionOf({ ...withLanguage, about: 'I build things.' }).done).toBe(2);
  });

  it('ignores the optional sections entirely', () => {
    // They are marked "(Optional)" in the design and are not among the five,
    // so filling one must not move the bar.
    const withRecords: ProfileDraft = {
      ...withLanguage,
      records: {
        ...withLanguage.records,
        workExperience: [{ id: 'a', fields: { role: 'Designer' } }],
        portfolio: [{ id: 'b', fields: { title: 'A case study' } }],
      },
    };
    expect(completionOf(withRecords)).toEqual({ done: 1, total: 5, percent: 20 });
  });

  it('reaches 100 when every key step is answered', () => {
    const full: ProfileDraft = {
      ...withLanguage,
      avatarUrl: 'blob:photo',
      displayName: 'Ayesha Khan',
      title: 'Product Designer',
      about: 'I build things.',
      skills: ['Figma'],
    };
    expect(completionOf(full)).toEqual({ done: KEY_STEPS.length, total: 5, percent: 100 });
  });
});
