import type { PublicProfile } from './api.ts';
import type { MakerStats } from './maker-stats.ts';

/**
 * A one-pixel image as a data URI.
 *
 * The fixture has to render without reaching storage: a layout sweep that
 * fetched real objects would fail when the bucket is unreachable, which is a
 * fact about the bucket rather than about the layout.
 */
const SWATCH = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLBwQAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

/**
 * A public profile with every section shared and every field at its longest.
 *
 * The real page is rendered on the server, so its data never passes through the
 * browser and a layout suite cannot intercept it. This fixture is what the
 * preview route and the resolution sweep render instead — the same component,
 * the widest content it will ever be asked to hold.
 */
export const DESIGN_PUBLIC_PROFILE: PublicProfile = {
  slug: 'opaque-slug-for-the-preview',
  displayName: 'Muhammad Abdullah Khan, Senior Service and Product Designer',
  avatarUrl: null,
  headline:
    'Senior service designer helping public-sector and enterprise teams turn complex, regulated journeys into measurable products',
  overview:
    'I partner with product and operations leaders to map difficult customer journeys, validate ideas through evidence-based research, and ship accessible services with measurable business outcomes. '.repeat(
      3,
    ),
  location: 'Lahore, Punjab, PK',
  availability: 'open_to_offers',
  availabilityNote: 'Open to one discovery engagement starting October 2026, remote or in Lahore',
  // Every period at once, and the widest a rate can be: fifteen digits, so the
  // card is measured at its worst rather than at a comfortable number.
  rates: [
    { currency: 'USD', amountMinor: '999999999999999', period: 'hourly' },
    { currency: 'USD', amountMinor: '250000', period: 'daily' },
    { currency: 'USD', amountMinor: '1200000', period: 'weekly' },
    { currency: 'USD', amountMinor: '4800000', period: 'monthly' },
    { currency: 'USD', amountMinor: '50000000', period: 'yearly' },
  ],
  responseTime: 'within_a_day',
  projectLength: 'three_to_six_months',
  availableFrom: '2026-10-01',
  remoteMode: 'hybrid',
  videoIntroUrl: 'https://vimeo.com/123456789',
  languages: [
    { name: 'Urdu', proficiency: 'native', starred: true },
    { name: 'English', proficiency: 'fluent', starred: false },
    { name: 'Portuguese', proficiency: 'conversational', starred: false },
  ],
  skills: [
    {
      name: 'Accessibility and inclusive design for regulated public services',
      proficiency: 'expert',
    },
    { name: 'Service design', proficiency: 'expert' },
    { name: 'Journey mapping', proficiency: 'advanced' },
  ],
  experience: [
    {
      role: 'Lead Service Designer, Digital Banking Platforms',
      organization: 'Erste Group Bank AG — Digital Innovation and Customer Experience Division',
      startDate: '2022-02-01',
      endDate: null,
      summary:
        'Led cross-functional discovery and prototyping for customer-facing banking services. '.repeat(
          4,
        ),
    },
  ],
  education: [
    {
      institution: 'University of Applied Arts Vienna, Institute of Design',
      qualification: 'Master of Arts in Social Design and Service Innovation',
      fieldOfStudy: 'Interaction & Service Design',
      startDate: '2013-09-01',
      endDate: '2017-06-30',
    },
  ],
  licenses: [
    {
      name: 'Accessibility Fundamentals for Digital Services',
      issuer: 'Interaction Design Foundation',
      issuedOn: '2025-03-10',
      expiresOn: null,
      files: [],
    },
  ],
  portfolio: [
    {
      title: 'Public benefits eligibility service redesign',
      url: 'https://example.com/case-studies/benefits-eligibility',
      summary:
        'Cut the time to a decision from eleven days to two, and the appeal rate by a third.',
      // A gallery with something in it: this fixture is what the public
      // profile's resolution sweep renders, and an empty list would sweep a
      // section that never draws the grid it exists to check.
      files: [
        ...Array.from({ length: 6 }, (_, index) => ({
          kind: 'image' as const,
          url: SWATCH,
          thumbUrl: SWATCH,
          objectKey: `profiles/p/portfolio/${String(index).padStart(16, '0')}.webp`,
          thumbKey: `profiles/p/portfolio/${String(index).padStart(16, '0')}-thumb.webp`,
          contentType: 'image/webp',
          byteSize: 302_114,
          width: 2048,
          height: 1365,
          fileName: `eligibility-${index}.png`,
        })),
        {
          kind: 'document' as const,
          url: SWATCH,
          thumbUrl: null,
          objectKey: 'profiles/p/portfolio/000000000000000a.pdf',
          thumbKey: null,
          contentType: 'application/pdf',
          byteSize: 880_000,
          width: null,
          height: null,
          fileName: 'eligibility-case-study.pdf',
        },
      ],
    },
  ],
  searchIndexable: false,
  publishedAt: '2026-09-01T00:00:00.000Z',
};

/**
 * The marketplace figures the design draws, for the preview only.
 *
 * Nothing here comes from the API — it cannot, because none of these fields
 * exist yet. They live in the fixture so the sidebar can be reviewed and swept
 * at its real height; the published page is passed no stats at all and renders
 * that part of the design empty until there is something true to put in it.
 */
export const DESIGN_MAKER_STATS: MakerStats = {
  jobSuccessRate: 100,
  completedBriefs: 24,
  responseTimeHours: 2,
  fullTimeAvailability: true,
  badges: [
    { label: 'Punctual', tone: 'merit' },
    { label: 'Verified Pro', tone: 'trust' },
  ],
  contactHref: '#contact-preview',
};
