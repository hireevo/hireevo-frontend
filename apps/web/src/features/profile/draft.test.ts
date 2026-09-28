import { describe, expect, it } from 'vitest';
import { NOTHING_FILLED, SECTION_WEIGHTS, completionOf, type SectionsFilled } from './draft.ts';

const filled = (...sections: (keyof SectionsFilled)[]): SectionsFilled => ({
  ...NOTHING_FILLED,
  ...Object.fromEntries(sections.map((section) => [section, true])),
});

describe('completionOf', () => {
  it('counts an untouched profile as nothing', () => {
    const completion = completionOf(NOTHING_FILLED);
    expect(completion.percent).toBe(0);
    expect(completion.done).toBe(0);
    expect(completion.total).toBe(6);
  });

  it('lists the rows the design draws, in its order', () => {
    const completion = completionOf(filled('about', 'skills', 'experience'));
    // About (10) + Skills (20) + Work experience (10) = 40.
    expect(completion.percent).toBe(40);
    expect(completion.done).toBe(3);
    expect(completion.label).toBe('Getting there');
    expect(completion.items.map((item) => [item.label, item.done])).toEqual([
      ['About section', true],
      ['Skills & expertise', true],
      ['Work experience', true],
      ['Education & certifications', false],
      ['Portfolio', false],
      ['Video intro', false],
    ]);
  });

  it('is worth twenty for skills, education and portfolio, and ten for the rest', () => {
    for (const section of ['skills', 'education', 'portfolio'] as const) {
      expect(completionOf(filled(section)).percent).toBe(20);
    }
    for (const section of ['about', 'experience', 'certifications', 'videoIntro'] as const) {
      expect(completionOf(filled(section)).percent).toBe(10);
    }
  });

  it('adds up to exactly a hundred, so a finished profile is never 99%', () => {
    const total = Object.values(SECTION_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBe(100);

    const everything = completionOf(filled(...(Object.keys(SECTION_WEIGHTS) as 'about'[])));
    expect(everything.percent).toBe(100);
    expect(everything.done).toBe(everything.total);
    expect(everything.label).toBe('Complete');
  });

  it('weighs education and certifications separately, and lists them as one row', () => {
    const row = 'Education & certifications';
    const edu = completionOf(filled('education'));
    // Education alone is worth twenty — the weighting is per section — but the
    // row the design draws is not finished until both are.
    expect(edu.percent).toBe(20);
    expect(edu.items.find((item) => item.label === row)?.done).toBe(false);

    const both = completionOf(filled('education', 'certifications'));
    // Certifications adds its own ten, and now the row is done.
    expect(both.percent).toBe(30);
    expect(both.items.find((item) => item.label === row)?.done).toBe(true);
  });

  it('does not count visibility or rates, which are settings rather than profile', () => {
    // There is no section for either: a profile does not become more complete
    // by being hidden, and this is the list that says so.
    expect(Object.keys(SECTION_WEIGHTS)).not.toContain('visibility');
    expect(Object.keys(SECTION_WEIGHTS)).not.toContain('rates');
  });
});
