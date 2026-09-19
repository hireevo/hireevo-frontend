import type { PublicProfile } from './api.ts';

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
  rate: {
    currency: 'PKR',
    hourlyMinor: '999999999999999',
    weeklyMinor: '18000000',
    // Priced by the hour and the week, not by the month — the widest the row
    // gets is three of these, and the honest state is that one is missing.
    monthlyMinor: null,
  },
  videoIntroUrl: 'https://vimeo.com/123456789',
  languages: [
    { name: 'Urdu', proficiency: 'native' },
    { name: 'English', proficiency: 'fluent' },
    { name: 'Portuguese', proficiency: 'conversational' },
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
    },
  ],
  portfolio: [
    {
      title: 'Public benefits eligibility service redesign',
      url: 'https://example.com/case-studies/benefits-eligibility',
      summary:
        'Cut the time to a decision from eleven days to two, and the appeal rate by a third.',
    },
  ],
  searchIndexable: false,
  publishedAt: '2026-09-01T00:00:00.000Z',
};
