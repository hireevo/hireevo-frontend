import { LuExternalLink, LuFileText, LuMapPin, LuUser, LuVideo } from 'react-icons/lu';
import { Card } from '@hireevo/ui-web';
import { RATE_PERIOD_LABEL, formatRate } from '@/features/profile-setup/location-options.ts';
import { SkillChips, SummaryList, joined, rangeOf } from '@/features/profile/section-summaries.tsx';
import type { PublicProfile } from './api.ts';

/** The rate, written the way it is read: "$5,000.00 per week". */
function readableRate(rate: PublicProfile['rate']): string | null {
  if (rate === null) return null;

  // An unknown currency code is still worth showing as a number.
  const shown =
    formatRate(rate.amountMinor, rate.currency) ?? `${rate.amountMinor} ${rate.currency}`;
  return `${shown} ${RATE_PERIOD_LABEL[rate.period] ?? rate.period}`;
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
            {rate === null ? null : <span>{rate}</span>}
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
          <ul className="flex flex-col gap-8">
            {profile.portfolio.map((piece, index) => (
              <li key={`portfolio-${index}`}>
                <PortfolioPiece piece={piece} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}

/**
 * One piece of work, with whatever it carries.
 *
 * The gallery renders thumbnails and links each to its full-size copy, rather
 * than loading twenty full-size images: a thumbnail is about fifteen kilobytes
 * against three hundred, and this page is the one a stranger opens on a phone
 * before deciding whether to read any further.
 *
 * Every image reserves its own space from the stored dimensions, so the text
 * below a gallery does not jump down the page as each one arrives.
 */
function PortfolioPiece({ piece }: { piece: PublicProfile['portfolio'][number] }) {
  const images = piece.files.filter((file) => file.kind === 'image');
  const documents = piece.files.filter((file) => file.kind === 'document');

  return (
    <article className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-content">{piece.title}</h3>
      {piece.summary === null || piece.summary === '' ? null : (
        <p className="text-sm text-content-subtle">{piece.summary}</p>
      )}

      {piece.url === null || piece.url === '' ? null : (
        <a
          href={piece.url}
          // A link on a public page to an address its owner typed: `noopener`
          // keeps the opened tab from reaching back through `window.opener`,
          // and `ugc` says this is not an endorsement.
          rel="noopener noreferrer ugc"
          target="_blank"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-content-accent underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <LuExternalLink aria-hidden="true" className="size-3.5" />
          Visit the work
        </a>
      )}

      {images.length === 0 ? null : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <li key={image.objectKey}>
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {/* Not `next/image`: the source is object storage, whose host is
                    configuration rather than something the optimiser is told
                    about at build time. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbUrl ?? image.url}
                  alt={image.fileName ?? `${piece.title}, image`}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  loading="lazy"
                  className="aspect-square size-full object-cover transition-opacity hover:opacity-90"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {documents.length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.objectKey}>
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit max-w-full items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-content transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LuFileText aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
                <span className="truncate">{document.fileName ?? 'Document'}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
