import { LuImages } from 'react-icons/lu';
import type { RecordSpec } from './record-section.tsx';

const join = (...parts: string[]) => parts.filter((part) => part !== '').join(' · ');

/**
 * The portfolio section, as data.
 *
 * Its heading and copy are the design's, verbatim; the fields are not — the
 * frame stops at the empty state. Work experience, education and certifications
 * had entries here too until each got its designed editor in profile-setup.
 */
export const RECORD_SPECS: Record<'portfolio', RecordSpec> = {
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
