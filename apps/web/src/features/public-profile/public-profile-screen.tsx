import { LuMapPin, LuUser, LuVideo } from 'react-icons/lu';
import { Card } from '@hireevo/ui-web';
import { SkillChips, SummaryList, joined, rangeOf } from '@/features/profile/section-summaries.tsx';
import type { PublicProfile } from './api.ts';

/** "PKR 5,000.00", from minor units the API sends as a string. */
function readableRate(rate: PublicProfile['rate']): string | null {
  if (rate === null) return null;
  try {
    const format = new Intl.NumberFormat('en', { style: 'currency', currency: rate.currency });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    return format.format(Number(rate.amountMinor) / 10 ** digits);
  } catch {
    // An unknown currency code is still worth showing as a number.
    return `${rate.amountMinor} ${rate.currency}`;
  }
}

const AVAILABILITY: Record<string, string> = {
  available: 'Available for work',
  open_to_offers: 'Open to offers',
  unavailable: 'Not taking work right now',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="text-lg font-bold text-content-accent">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A published profile as anyone on the internet sees it.
 *
 * Every field here has already been through the API's visibility rules: a
 * section the freelancer did not mark public arrives empty or null, so this
 * page renders what it is given and never decides what may be shown. A profile
 * that has marked nothing says so, rather than rendering as a blank page that
 * looks broken.
 */
export function PublicProfileScreen({ profile }: { profile: PublicProfile }) {
  const rate = readableRate(profile.rate);
  const availability =
    profile.availability === null ? null : (AVAILABILITY[profile.availability] ?? null);

  const shares =
    profile.displayName !== null ||
    profile.overview !== null ||
    profile.location !== null ||
    profile.videoIntroUrl !== null ||
    rate !== null ||
    availability !== null ||
    profile.languages.length +
      profile.skills.length +
      profile.experience.length +
      profile.education.length +
      profile.licenses.length +
      profile.portfolio.length >
      0;

  return (
    <main id="main-content" className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
          {profile.avatarUrl === null ? (
            <LuUser aria-hidden="true" className="size-9 text-content-subtle" />
          ) : (
            // Not `next/image`: the source is object storage, whose host is
            // configuration rather than something to pin in the build.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl leading-tight font-bold text-balance text-content-accent">
            {profile.displayName ?? 'HireEvo profile'}
          </h1>
          {profile.headline === null ? null : (
            <p className="mt-1 text-base text-content-muted">{profile.headline}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-content-subtle">
            {profile.location === null ? null : (
              <span className="inline-flex items-center gap-1.5">
                <LuMapPin aria-hidden="true" className="size-4 shrink-0" />
                {profile.location}
              </span>
            )}
            {availability === null ? null : <span>{availability}</span>}
            {rate === null ? null : <span>{rate} per hour</span>}
          </div>

          {profile.availabilityNote === null ? null : (
            <p className="mt-3 text-sm text-content-muted">{profile.availabilityNote}</p>
          )}
        </div>
      </Card>

      {!shares ? (
        <p className="mt-8 text-sm text-content-subtle">
          This profile is published but its owner has not shared any of it publicly yet.
        </p>
      ) : null}

      {profile.overview === null ? null : (
        <Section title="About">
          <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">
            {profile.overview}
          </p>
        </Section>
      )}

      {profile.videoIntroUrl === null ? null : (
        <Section title="Video intro">
          {/* A link rather than an embed: the address is the freelancer's, and
              framing someone else's page is their decision to make, not ours. */}
          <a
            href={profile.videoIntroUrl}
            rel="nofollow noopener noreferrer"
            target="_blank"
            className="inline-flex min-h-6 items-center gap-2 rounded-sm text-sm font-medium text-content-link underline underline-offset-4"
          >
            <LuVideo aria-hidden="true" className="size-4 shrink-0" />
            Watch the introduction
          </a>
        </Section>
      )}

      {profile.skills.length === 0 ? null : (
        <Section title="Skills">
          <SkillChips names={profile.skills.map((skill) => skill.name)} />
        </Section>
      )}

      {profile.languages.length === 0 ? null : (
        <Section title="Languages">
          <SkillChips
            names={profile.languages.map((language) =>
              joined(language.name, language.proficiency ?? ''),
            )}
          />
        </Section>
      )}

      {profile.experience.length === 0 ? null : (
        <Section title="Work experience">
          <SummaryList
            rows={profile.experience.map((entry, index) => ({
              key: `experience-${index}`,
              primary: entry.role,
              secondary: joined(
                entry.organization ?? '',
                rangeOf(entry.startDate ?? '', entry.endDate ?? ''),
              ),
              body: entry.summary ?? '',
            }))}
          />
        </Section>
      )}

      {profile.education.length === 0 ? null : (
        <Section title="Education">
          <SummaryList
            rows={profile.education.map((entry, index) => ({
              key: `education-${index}`,
              primary: entry.institution,
              secondary: joined(
                entry.qualification ?? '',
                entry.fieldOfStudy ?? '',
                rangeOf(entry.startDate ?? '', entry.endDate ?? ''),
              ),
            }))}
          />
        </Section>
      )}

      {profile.licenses.length === 0 ? null : (
        <Section title="Certifications">
          <SummaryList
            rows={profile.licenses.map((entry, index) => ({
              key: `license-${index}`,
              primary: entry.name,
              secondary: joined(entry.issuer ?? '', rangeOf(entry.issuedOn ?? '', '')),
            }))}
          />
        </Section>
      )}

      {profile.portfolio.length === 0 ? null : (
        <Section title="Portfolio">
          <SummaryList
            rows={profile.portfolio.map((piece, index) => ({
              key: `portfolio-${index}`,
              primary: piece.title,
              secondary: piece.url ?? '',
              body: piece.summary ?? '',
            }))}
          />
        </Section>
      )}
    </main>
  );
}
