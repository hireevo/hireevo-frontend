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

  it('matches the state the design draws', () => {
    // The frame shows About, skills and work experience done, the other three
    // rows to do, and "50% complete". If those ever disagree, it shows here.
    const completion = completionOf(filled('about', 'skills', 'experience'));
    expect(completion.percent).toBe(50);
    expect(completion.done).toBe(3);
    expect(completion.label).toBe('Strong');
    expect(completion.items.map((item) => [item.label, item.done])).toEqual([
      ['About section', true],
      ['Skills & expertise', true],
      ['Work experience', true],
      ['Education & certifications', false],
      ['Portfolio', false],
      ['Add a video intro', false],
    ]);
  });

  it('is worth twenty for what a buyer decides on, and ten for the rest', () => {
    for (const section of ['skills', 'experience', 'portfolio'] as const) {
      expect(completionOf(filled(section)).percent).toBe(20);
    }
    for (const section of ['about', 'education', 'certifications', 'videoIntro'] as const) {
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

  it('counts education and certifications separately, and lists them together', () => {
    const half = completionOf(filled('education'));
    expect(half.percent).toBe(10);
    // The row the design draws is one row, and it is not finished yet.
    expect(half.items.find((item) => item.label === 'Education & certifications')?.done).toBe(
      false,
    );

    const both = completionOf(filled('education', 'certifications'));
    expect(both.percent).toBe(20);
    expect(both.items.find((item) => item.label === 'Education & certifications')?.done).toBe(true);
  });

  it('does not count visibility or rates, which are settings rather than profile', () => {
    // There is no section for either: a profile does not become more complete
    // by being hidden, and this is the list that says so.
    expect(Object.keys(SECTION_WEIGHTS)).not.toContain('visibility');
    expect(Object.keys(SECTION_WEIGHTS)).not.toContain('rates');
  });
});
