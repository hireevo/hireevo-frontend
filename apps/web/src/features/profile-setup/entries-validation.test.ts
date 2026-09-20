import { describe, expect, it } from 'vitest';
import {
  normaliseSkill,
  todayIso,
  validateEducation,
  validateExperience,
  validateLanguages,
  validateLicenses,
  validateSkills,
} from './entries-validation.ts';

const entry = <F extends string>(key: string, values: Record<F, string>) => ({ key, values });

describe('todayIso', () => {
  it('writes the local date the way a date input does', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('normaliseSkill', () => {
  it('keeps years to two whole digits and leaves other fields alone', () => {
    expect(normaliseSkill('years', '1,234')).toBe('12');
    expect(normaliseSkill('years', 'seven')).toBe('');
    expect(normaliseSkill('name', 'UX 2.0')).toBe('UX 2.0');
  });
});

describe('validateLanguages', () => {
  it('flags a language where it repeats, whatever its case or spacing', () => {
    expect(
      validateLanguages([
        entry('l-0', { name: 'German' }),
        entry('l-1', { name: '' }),
        entry('l-2', { name: '  german ' }),
      ]),
    ).toEqual({ 'l-2.name': 'This language is already listed.' });
  });
});

describe('validateSkills', () => {
  it('accepts empty fields and any case of a listed proficiency', () => {
    expect(
      validateSkills([
        entry('s-0', { name: '', proficiency: '', years: '' }),
        entry('s-1', { name: 'User research', proficiency: 'expert', years: '60' }),
      ]),
    ).toEqual({});
  });

  it('refuses an unknown proficiency, too many years and a repeated skill', () => {
    expect(
      validateSkills([
        entry('s-0', { name: 'Service design', proficiency: 'Guru', years: '61' }),
        entry('s-1', { name: 'service  design', proficiency: 'Advanced', years: '6' }),
      ]),
    ).toEqual({
      's-0.proficiency': 'Choose Beginner, Intermediate, Advanced or Expert.',
      's-0.years': 'Enter whole years, up to 60.',
      's-1.name': 'This skill is already listed.',
    });
  });
});

describe('date order', () => {
  const today = '2026-09-15';

  it('accepts a role that starts today and one with no end yet', () => {
    const role = { role: 'r', organization: 'o', summary: 's' };
    expect(
      validateExperience(
        [
          entry('r-0', { ...role, startDate: today, endDate: today }),
          entry('r-1', { ...role, startDate: '2020-01-01', endDate: '' }),
        ],
        today,
      ),
    ).toEqual({});
  });

  it('refuses a role that starts in the future or ends before it starts', () => {
    const role = { role: 'r', organization: 'o', summary: 's' };
    expect(
      validateExperience(
        [
          entry('r-0', { ...role, startDate: '2026-09-16', endDate: '' }),
          entry('r-1', { ...role, startDate: '2022-02-01', endDate: '2022-01-31' }),
        ],
        today,
      ),
    ).toEqual({
      'r-0.startDate': 'The start date is in the future.',
      'r-1.endDate': 'The end date is before the start date.',
    });
  });

  it('refuses education that ends before it starts', () => {
    const study = { institution: 'i', qualification: 'q', fieldOfStudy: 'f' };
    expect(
      validateEducation([
        entry('e-0', { ...study, startDate: '2013-09-01', endDate: '2013-06-30' }),
      ]),
    ).toEqual({ 'e-0.endDate': 'The end date is before the start date.' });
  });

  it('refuses a license issued in the future or expiring before it was issued', () => {
    const license = { name: 'n', issuer: 'i' };
    expect(
      validateLicenses(
        [
          entry('c-0', { ...license, issued: '2027-01-01', expires: '' }),
          entry('c-1', { ...license, issued: '2025-03-10', expires: '2025-03-09' }),
          entry('c-2', { ...license, issued: '2025-03-10', expires: '2025-03-10' }),
        ],
        today,
      ),
    ).toEqual({
      'c-0.issued': 'The issue date is in the future.',
      'c-1.expires': 'The expiry date is before the issue date.',
    });
  });
});
