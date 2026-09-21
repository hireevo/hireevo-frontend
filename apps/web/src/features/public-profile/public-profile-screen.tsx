import Link from 'next/link';
import {
  LuClock,
  LuExternalLink,
  LuFileText,
  LuGlobe,
  LuMapPin,
  LuMessageSquare,
  LuUser,
  LuVideo,
} from 'react-icons/lu';
import { RATE_PERIOD_LABEL, formatRate } from '@/features/profile-setup/location-options.ts';
import type { PublicProfile } from './api.ts';
import type { MakerStats } from './maker-stats.ts';

/** The rate, split so the design can set the figure and the unit differently. */
function readableRate(rate: PublicProfile['rate']): { amount: string; per: string } | null {
  if (rate === null) return null;

  // An unknown currency code is still worth showing as a number.
  const amount =
    formatRate(rate.amountMinor, rate.currency) ?? `${rate.amountMinor} ${rate.currency}`;
  // "per week" reads as a sentence; beside a figure the design wants "/ week".
  const per = (RATE_PERIOD_LABEL[rate.period] ?? rate.period).replace(/^per\s+/i, '');

  return { amount, per };
}

const AVAILABILITY: Record<string, { label: string; open: boolean }> = {
  available: { label: 'Available Now', open: true },
  open_to_offers: { label: 'Open to offers', open: true },
  unavailable: { label: 'Not taking work', open: false },
};

/** The year something finished, which is all the design shows for a course. */
const yearOf = (day: string | null): string | null => day?.slice(0, 4) ?? null;

/** "Jan 2021 – Present", as the work history is drawn. */
function period(start: string | null, end: string | null): string | null {
  const month = (day: string) =>
    new Date(`${day.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  if (start === null) return end === null ? null : month(end);
  return `${month(start)} – ${end === null ? 'Present' : month(end)}`;
}

/**
 * One panel of the profile.
 *
 * `title` renders the heading *and* names the landmark: a bare `<section>` is
 * not exposed as a region to a screen reader at all, so a page of them is a
 * page with no structure to jump between. Passing the two separately let them
 * drift — this way a titled card cannot be unnamed.
 */
function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id =
    title === undefined ? undefined : `panel-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <section
      {...(id === undefined ? {} : { 'aria-labelledby': id })}
      className={`rounded-2xl border border-border-subtle bg-surface p-6 ${className}`}
    >
      {title === undefined ? null : (
        <h2 id={id} className="text-lg font-bold text-content-accent">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** The pill used for skills and languages: same shape, different contents. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-surface-accent-subtle px-3 py-1.5 text-sm text-content-accent">
      {children}
    </li>
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
 *
 * The layout is two columns on a wide screen and one on a narrow one, and the
 * order changes with it: the rate and the way to get in touch sit beside the
 * profile on a desktop and directly under the name on a phone, because that is
 * what a visitor came for and it must not land at the bottom of a long page.
 */
export function PublicProfileScreen({
  profile,
  stats = {},
}: {
  profile: PublicProfile;
  stats?: MakerStats;
}) {
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

  const name = profile.displayName ?? 'HireEvo profile';
  const languageLine = profile.languages
    .map((language) =>
      language.proficiency === null ? language.name : `${language.name} (${language.proficiency})`,
    )
    .join(', ');

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
      {/* "Makers" is not a link: there is no index of makers to send anyone to
          yet, and a breadcrumb into a 404 is worse than one that does not move
          (§6.7). It becomes a link when that page exists. */}
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-content-subtle">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link
              href="/"
              className="rounded-sm hover:text-content-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>Makers</li>
          <li aria-hidden="true">/</li>
          <li className="min-w-0 truncate font-medium text-content">{name}</li>
        </ol>
      </nav>

      {/* `*:min-w-0` because a grid item defaults to `min-width: auto` and
          refuses to shrink below its content: one long unbreakable figure in
          the rate card was enough to push the whole page into a sideways
          scroll at 320px (§6.11). */}
      <div className="grid items-start gap-5 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl leading-tight font-bold text-balance text-content-accent">
                  {name}
                </h1>
                {availability === null ? null : (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      availability.open
                        ? 'bg-surface-success-subtle text-content-success'
                        : 'bg-surface-muted text-content-subtle'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${availability.open ? 'bg-content-success' : 'bg-content-subtle'}`}
                    />
                    {availability.label}
                  </span>
                )}
              </div>

              {profile.headline === null ? null : (
                <p className="mt-1.5 text-base text-content-muted">{profile.headline}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-content-subtle">
                {profile.location === null ? null : (
                  <span className="inline-flex items-center gap-1.5">
                    <LuMapPin aria-hidden="true" className="size-4 shrink-0" />
                    {profile.location}
                  </span>
                )}
                {languageLine === '' ? null : (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <LuGlobe aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">{languageLine}</span>
                  </span>
                )}
              </div>

              {profile.availabilityNote === null ? null : (
                <p className="mt-3 text-sm text-content-muted">{profile.availabilityNote}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Second in the DOM so a phone reads name → rate → the rest, and
            placed into the right-hand column on a wide screen. */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <RateCard profile={profile} rate={rate} stats={stats} />
          <RecordCard stats={stats} />
        </aside>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
          {!shares ? (
            <p className="text-sm text-content-subtle">
              This profile is published but its owner has not shared any of it publicly yet.
            </p>
          ) : null}

          {profile.overview === null ? null : (
            <Card title="About">
              <p className="mt-3 text-sm leading-[1.7] whitespace-pre-line text-content-muted">
                {profile.overview}
              </p>
            </Card>
          )}

          {profile.skills.length === 0 ? null : (
            <Card title="Skills and expertise">
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Chip key={skill.name}>{skill.name}</Chip>
                ))}
              </ul>
            </Card>
          )}

          {profile.experience.length === 0 ? null : (
            <Card title="Work experience">
              <ol className="mt-4 flex flex-col">
                {profile.experience.map((entry, index) => (
                  <li
                    key={`experience-${index}`}
                    className={index === 0 ? '' : 'mt-6 border-t border-border-subtle pt-6'}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-base font-bold text-content-accent">{entry.role}</h3>
                      {period(entry.startDate, entry.endDate) === null ? null : (
                        <span className="text-sm text-content-subtle">
                          {period(entry.startDate, entry.endDate)}
                        </span>
                      )}
                    </div>
                    {entry.organization === null ? null : (
                      <p className="mt-1 text-sm font-medium text-content-link">
                        {entry.organization}
                      </p>
                    )}
                    {entry.summary === null ? null : (
                      <p className="mt-2 text-sm leading-[1.7] text-content-muted">
                        {entry.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {profile.education.length === 0 && profile.licenses.length === 0 ? null : (
            <div className="grid gap-5 *:min-w-0 sm:grid-cols-2">
              {profile.education.length === 0 ? null : (
                <Card title="Education">
                  <ol className="mt-4 flex flex-col gap-4">
                    {profile.education.map((entry, index) => (
                      <li key={`education-${index}`}>
                        <h3 className="text-base font-bold text-content-accent">
                          {entry.qualification ?? entry.institution}
                        </h3>
                        {entry.qualification === null ? null : (
                          <p className="mt-1 text-sm font-medium text-content-link">
                            {entry.institution}
                          </p>
                        )}
                        {yearOf(entry.endDate) === null ? null : (
                          <p className="mt-1 text-sm text-content-subtle">
                            Graduated {yearOf(entry.endDate)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </Card>
              )}

              {profile.licenses.length === 0 ? null : (
                <Card title="Certifications">
                  <ol className="mt-4 flex flex-col">
                    {profile.licenses.map((entry, index) => (
                      <li
                        key={`license-${index}`}
                        className={index === 0 ? '' : 'mt-4 border-t border-border-subtle pt-4'}
                      >
                        <h3 className="text-base font-bold text-content-accent">{entry.name}</h3>
                        <p className="mt-1 text-sm text-content-subtle">
                          {[entry.issuer, yearOf(entry.issuedOn)].filter(Boolean).join(' • ')}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          )}

          {profile.languages.length === 0 ? null : (
            <Card title="Languages">
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.languages.map((language) => (
                  <Chip key={language.name}>
                    <span className="font-medium">{language.name}</span>
                    {language.proficiency === null ? null : (
                      <>
                        <span aria-hidden="true" className="mx-2 text-content-subtle">
                          —
                        </span>
                        <span className="text-content-muted">{language.proficiency}</span>
                      </>
                    )}
                  </Chip>
                ))}
              </ul>
            </Card>
          )}

          {profile.videoIntroUrl === null ? null : (
            <Card title="Video intro">
              {/* A link rather than an embed: the address is the freelancer's,
                  and framing someone else's page is their decision, not ours. */}
              <a
                href={profile.videoIntroUrl}
                rel="nofollow noopener noreferrer"
                target="_blank"
                className="mt-3 inline-flex min-h-6 items-center gap-2 rounded-sm text-sm font-medium text-content-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LuVideo aria-hidden="true" className="size-4 shrink-0" />
                Watch the introduction
              </a>
            </Card>
          )}

          {profile.portfolio.length === 0 ? null : (
            <Card title="Portfolio">
              <ul className="mt-4 grid gap-5 *:min-w-0 sm:grid-cols-2">
                {profile.portfolio.map((piece, index) => (
                  <li key={`portfolio-${index}`}>
                    <PortfolioPiece piece={piece} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * The rate, and what it costs to find out more.
 *
 * Everything below the rate is earned rather than self-reported, so each line
 * appears only when there is a real figure behind it. A page that says "Avg
 * response time: 2 hrs" because the design did is a page that lies to whoever
 * is choosing between two freelancers.
 */
function RateCard({
  profile,
  rate,
  stats,
}: {
  profile: PublicProfile;
  rate: { amount: string; per: string } | null;
  stats: MakerStats;
}) {
  const firstName = profile.displayName?.trim().split(/\s+/)[0] ?? null;
  const details = [
    stats.fullTimeAvailability === true ? { icon: LuClock, text: 'Full-time availability' } : null,
    stats.responseTimeHours === undefined
      ? null
      : {
          icon: LuMessageSquare,
          text: `Avg response time: ${stats.responseTimeHours} hr${stats.responseTimeHours === 1 ? '' : 's'}`,
        },
  ].filter((detail) => detail !== null);

  const badges = stats.badges ?? [];
  const empty =
    rate === null && details.length === 0 && badges.length === 0 && stats.contactHref === undefined;

  if (empty) return null;

  return (
    <Card>
      {rate === null ? null : (
        <>
          <h2 className="text-xs font-medium tracking-wide text-content-subtle uppercase">
            Starting rate
          </h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="text-3xl font-bold break-all text-content-accent">{rate.amount}</span>
            <span className="text-sm text-content-subtle">/ {rate.per}</span>
          </p>
        </>
      )}

      {details.length === 0 ? null : (
        <ul
          className={`flex flex-col gap-3 text-sm text-content-muted ${rate === null ? '' : 'mt-5 border-t border-border-subtle pt-5'}`}
        >
          {details.map((detail) => (
            <li key={detail.text} className="flex items-center gap-2.5">
              <detail.icon aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
              <span className="min-w-0">{detail.text}</span>
            </li>
          ))}
        </ul>
      )}

      {badges.length === 0 ? null : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge.label}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                badge.tone === 'trust'
                  ? 'bg-surface-accent-subtle text-content-accent'
                  : 'bg-surface-warning-subtle text-content-warning'
              }`}
            >
              {badge.label}
            </li>
          ))}
        </ul>
      )}

      {stats.contactHref === undefined ? null : (
        <a
          href={stats.contactHref}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-content-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {firstName === null ? 'Get in touch' : `Contact ${firstName}`}
        </a>
      )}
    </Card>
  );
}

/** What the marketplace has recorded about this maker, when it has recorded any. */
function RecordCard({ stats }: { stats: MakerStats }) {
  const rows = [
    stats.jobSuccessRate === undefined
      ? null
      : { figure: `${stats.jobSuccessRate}%`, label: 'Job success rate' },
    stats.completedBriefs === undefined
      ? null
      : { figure: String(stats.completedBriefs), label: 'Completed briefs' },
  ].filter((row) => row !== null);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl bg-surface-accent-subtle p-6">
      <dl className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="sr-only">{row.label}</dt>
            <dd>
              <span className="block text-2xl font-bold text-content-accent">{row.figure}</span>
              <span className="mt-0.5 block text-sm text-content-muted">{row.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * One piece of work, as a card with a cover.
 *
 * The cover is the first image's thumbnail rather than the full-size copy —
 * fifteen kilobytes against three hundred, on the page a stranger opens on a
 * phone before deciding whether to read any further. A piece carrying more than
 * one image says so rather than hiding them.
 *
 * Every cover reserves its space from the stored dimensions, so the titles
 * below do not jump down the page as the images arrive.
 */
function PortfolioPiece({ piece }: { piece: PublicProfile['portfolio'][number] }) {
  const images = piece.files.filter((file) => file.kind === 'image');
  const documents = piece.files.filter((file) => file.kind === 'document');
  const cover = images[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle">
      {cover === undefined ? null : (
        <a
          href={cover.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          {/* Not `next/image`: the source is object storage, whose host is
              configuration rather than something the optimiser is told about at
              build time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.thumbUrl ?? cover.url}
            alt={cover.fileName ?? piece.title}
            width={cover.width ?? undefined}
            height={cover.height ?? undefined}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          {images.length < 2 ? null : (
            <span className="absolute right-2 bottom-2 rounded-full bg-surface-inverse px-2.5 py-1 text-xs font-medium text-content-inverse">
              +{images.length - 1} more
            </span>
          )}
        </a>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <h3 className="text-base font-bold text-content-accent">{piece.title}</h3>
        {piece.summary === null || piece.summary === '' ? null : (
          <p className="text-sm text-content-muted">{piece.summary}</p>
        )}

        {piece.url === null || piece.url === '' ? null : (
          <a
            href={piece.url}
            // A link on a public page to an address its owner typed: `noopener`
            // keeps the opened tab from reaching back through `window.opener`,
            // and `ugc` says this is not an endorsement.
            rel="noopener noreferrer ugc"
            target="_blank"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-content-link underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
            Visit the work
          </a>
        )}

        {documents.length === 0 ? null : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {documents.map((document) => (
              <li key={document.objectKey}>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit max-w-full items-center gap-2 rounded-sm text-sm text-content-muted hover:text-content-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <LuFileText aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{document.fileName ?? 'Document'}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
