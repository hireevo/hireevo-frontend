import { describe, expect, it } from 'vitest';
import { fromSavedSections, toSectionsPayload, type SavedSections } from './sections-payload.ts';

describe('toSectionsPayload', () => {
  it('drops the empty entry every list starts with', () => {
    expect(
      toSectionsPayload({
        skills: [{ name: '', proficiency: '', years: '' }],
        experience: [{ role: '  ', organization: 'Erste Digital' }],
      }),
    ).toEqual({ skills: [], experience: [] });
  });

  it('leaves out a list the screen does not hold', () => {
    // An absent list is "no change"; an empty one would clear what was saved.
    expect(toSectionsPayload({ skills: [{ name: 'Figma' }] })).toEqual({
      skills: [{ name: 'Figma', proficiency: null, years: null }],
    });
  });

  it('sends years as a number and a proficiency as the API spells it', () => {
    expect(
      toSectionsPayload({ skills: [{ name: ' Figma ', proficiency: 'Expert', years: '7' }] }),
    ).toEqual({ skills: [{ name: 'Figma', proficiency: 'expert', years: 7 }] });
  });

  it('matches a language level written for a person to read', () => {
    expect(
      toSectionsPayload({
        languages: [
          { name: 'Urdu', proficiency: 'Native or bilingual' },
          { name: 'German', proficiency: 'Conversational' },
          { name: 'French', proficiency: '' },
        ],
      }),
    ).toEqual({
      languages: [
        { name: 'Urdu', proficiency: 'native' },
        { name: 'German', proficiency: 'conversational' },
        { name: 'French', proficiency: null },
      ],
    });
  });

  it('sends an empty optional field as nothing at all', () => {
    expect(
      toSectionsPayload({
        licenses: [{ name: 'Accessibility', issuer: '', issued: '2025-03-10', expires: '' }],
      }),
    ).toEqual({
      licenses: [{ name: 'Accessibility', issuer: null, issuedOn: '2025-03-10', expiresOn: null }],
    });
  });
});

const saved = (overrides: Partial<SavedSections> = {}): SavedSections => ({
  languages: [],
  skills: [],
  experience: [],
  education: [],
  licenses: [],
  portfolio: [],
  ...overrides,
});

describe('fromSavedSections', () => {
  it('shows every value as a string, because an input cannot hold null', () => {
    const shown = fromSavedSections(
      saved({
        skills: [{ name: 'Figma', proficiency: null, years: null, approved: true }],
        experience: [
          {
            role: 'Lead',
            organization: null,
            startDate: '2022-02-01',
            endDate: null,
            summary: null,
          },
        ],
      }),
    );

    expect(shown.skills).toEqual([{ name: 'Figma', proficiency: '', years: '' }]);
    expect(shown.experience[0]).toEqual({
      role: 'Lead',
      organization: '',
      startDate: '2022-02-01',
      endDate: '',
      summary: '',
    });
  });

  it('names a stored level the way its own list offers it', () => {
    const shown = fromSavedSections(
      saved({
        languages: [{ name: 'Urdu', proficiency: 'native' }],
        skills: [{ name: 'Figma', proficiency: 'expert', years: 7, approved: true }],
      }),
      {
        languages: ['Basic', 'Conversational', 'Fluent', 'Native or bilingual'],
        skills: ['Expert'],
      },
    );

    expect(shown.languages[0]?.proficiency).toBe('Native or bilingual');
    expect(shown.skills[0]).toEqual({ name: 'Figma', proficiency: 'Expert', years: '7' });
  });

  it('survives a round trip through the payload', () => {
    const shown = fromSavedSections(
      saved({
        licenses: [
          {
            name: 'Accessibility',
            issuer: 'IDF',
            issuedOn: '2025-03-10',
            expiresOn: null,
          },
        ],
      }),
    );

    expect(toSectionsPayload({ licenses: shown.licenses }).licenses).toEqual([
      { name: 'Accessibility', issuer: 'IDF', issuedOn: '2025-03-10', expiresOn: null },
    ]);
  });
});
