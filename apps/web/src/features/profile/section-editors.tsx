'use client';

import dynamic from 'next/dynamic';

/** Held in the card's place while its editor is fetched. */
function Opening() {
  return (
    <p role="status" className="py-4 text-sm text-content-subtle">
      Opening…
    </p>
  );
}

/**
 * The editors behind each section's "Add" button, fetched when one is opened.
 *
 * Signing in lands here, so what this page costs to open matters more than
 * anywhere else in the app. The editors are its heavy part — the skills editor
 * alone carries the approved-skills taxonomy and a list of languages — and a
 * visit usually opens one section, not six. Fetching them on demand keeps all
 * of that out of the landing page, and costs no navigation: the editor opens
 * where its card already is.
 */
export const IdentityEditor = dynamic(
  () =>
    import('@/features/profile-setup/identity-fields.tsx').then((module) => module.IdentityFields),
  { loading: Opening },
);

export const ContactEditor = dynamic(
  () =>
    import('@/features/profile-setup/contact-fields.tsx').then((module) => module.ContactFields),
  { loading: Opening },
);

export const SkillsEditor = dynamic(
  () => import('@/features/profile-setup/skill-lists.tsx').then((module) => module.SkillsList),
  { loading: Opening },
);

export const ExperienceEditor = dynamic(
  () =>
    import('@/features/profile-setup/experience-list.tsx').then((module) => module.ExperienceList),
  { loading: Opening },
);

export const EducationEditor = dynamic(
  () =>
    import('@/features/profile-setup/education-lists.tsx').then((module) => module.EducationList),
  { loading: Opening },
);

export const LicenseEditor = dynamic(
  () => import('@/features/profile-setup/education-lists.tsx').then((module) => module.LicenseList),
  { loading: Opening },
);

export const RatesEditor = dynamic(
  () => import('./rates-editor.tsx').then((module) => module.RatesEditor),
  { loading: Opening },
);

export const WorkingPreferencesEditor = dynamic(
  () =>
    import('./working-preferences-editor.tsx').then((module) => module.WorkingPreferencesEditor),
  { loading: Opening },
);

export const VisibilityEditor = dynamic(
  () => import('./visibility-editor.tsx').then((module) => module.VisibilityEditor),
  { loading: Opening },
);

export const VideoIntroEditor = dynamic(
  () => import('./video-intro-editor.tsx').then((module) => module.VideoIntroEditor),
  { loading: Opening },
);
