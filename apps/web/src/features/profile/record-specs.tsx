import { LuAward, LuBriefcaseBusiness, LuGraduationCap, LuImages } from 'react-icons/lu';
import type { RecordSectionId } from './draft.ts';
import type { RecordSpec } from './record-section.tsx';

/** "2021 — Present", or one end of it, or nothing if neither was given. */
const period = (from: string, to: string) =>
  [from, to === '' ? (from === '' ? '' : 'Present') : to].filter(Boolean).join(' — ');

const join = (...parts: string[]) => parts.filter((part) => part !== '').join(' · ');

/**
 * The four optional sections, as data.
 *
 * Headings and copy are the design's, verbatim. The fields are not — the frame
 * stops at the empty state — so they are the shortest set that makes an entry
 * worth reading, and are deliberately all optional except the one or two that
 * name the thing.
 */
export const RECORD_SPECS: Record<Exclude<RecordSectionId, never>, RecordSpec> = {
  workExperience: {
    title: 'Work experience',
    description:
      'Add your job history and achievements to give clients insight into your expertise.',
    icon: <LuBriefcaseBusiness />,
    addLabel: 'Add work experience',
    noun: 'role',
    fields: [
      { name: 'role', label: 'Role', placeholder: 'Product Designer', required: true },
      { name: 'company', label: 'Company', placeholder: 'Acme', required: true },
      { name: 'from', label: 'From', type: 'month' },
      { name: 'to', label: 'To', type: 'month' },
      { name: 'summary', label: 'What you did', placeholder: 'One line is plenty', wide: true },
    ],
    summary: (f) => ({
      primary: join(f.role ?? '', f.company ?? ''),
      secondary: join(period(f.from ?? '', f.to ?? ''), f.summary ?? ''),
    }),
  },

  education: {
    title: 'Education',
    description: 'Back up your skills by adding any educational degrees or programs.',
    icon: <LuGraduationCap />,
    addLabel: 'Add education',
    noun: 'qualification',
    fields: [
      { name: 'qualification', label: 'Degree or program', placeholder: 'BSc', required: true },
      { name: 'school', label: 'Institution', placeholder: 'University', required: true },
      { name: 'from', label: 'From', type: 'month' },
      { name: 'to', label: 'To', type: 'month' },
    ],
    summary: (f) => ({
      primary: join(f.qualification ?? '', f.school ?? ''),
      secondary: period(f.from ?? '', f.to ?? ''),
    }),
  },

  certifications: {
    title: 'Certifications',
    description: 'Showcase your mastery with certifications earned in your field.',
    icon: <LuAward />,
    addLabel: 'Add certifications',
    noun: 'certification',
    fields: [
      {
        name: 'name',
        label: 'Certification',
        placeholder: 'AWS Solutions Architect',
        required: true,
      },
      { name: 'issuer', label: 'Issued by', placeholder: 'Amazon Web Services', required: true },
      { name: 'year', label: 'Year', placeholder: '2025' },
      { name: 'url', label: 'Credential link', type: 'url', placeholder: 'https://' },
    ],
    summary: (f) => ({
      primary: f.name ?? '',
      secondary: join(f.issuer ?? '', f.year ?? ''),
    }),
  },

  portfolio: {
    title: 'Portfolio',
    description: 'Showcase your best work to attract potential clients.',
    icon: <LuImages />,
    // The frame labels this one "+ Add portfolio", next to the same plus
    // icon every other section has — the character was typed into the text
    // by mistake, and kept it would render as two plus signs.
    addLabel: 'Add portfolio',
    noun: 'piece',
    fields: [
      { name: 'title', label: 'Title', placeholder: 'Checkout redesign', required: true },
      { name: 'url', label: 'Link', type: 'url', placeholder: 'https://' },
      { name: 'summary', label: 'What it is', placeholder: 'One line is plenty', wide: true },
    ],
    summary: (f) => ({ primary: f.title ?? '', secondary: join(f.url ?? '', f.summary ?? '') }),
  },
};
