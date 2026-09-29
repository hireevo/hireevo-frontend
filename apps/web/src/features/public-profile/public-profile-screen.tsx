import Link from 'next/link';
import {
  LuCalendarDays,
  LuClock,
  LuExternalLink,
  LuGlobe,
  LuMapPin,
  LuMessageSquare,
  LuMonitor,
  LuPlay,
  LuUser,
  LuVideo,
} from 'react-icons/lu';
import { RATE_PERIOD_LABEL, formatRate } from '@/features/profile-setup/location-options.ts';
import {
  labelOfRemoteMode,
  labelOfResponseTime,
  phraseOfProjectLength,
} from '@/features/profile-setup/preference-options.ts';
import { videoThumbnail } from '@/features/profile/video-url.ts';
import { Markdown } from '@/features/rich-text/markdown.tsx';
import { FileDocuments, FileThumbGrid } from '@/features/media/file-gallery.tsx';
import { FileCover } from '@/features/media/file-preview.tsx';
import { MediaThumb } from '@/features/media/media-thumb.tsx';
import type { PublicProfile } from './api.ts';
import type { MakerStats } from './maker-stats.ts';

/** Each rate, split so the design can set the figure and the unit differently. */
function readableRates(rates: PublicProfile['rates']): { amount: string; per: string }[] {
  return rates.map((rate) => ({
    // An unknown currency code is still worth showing as a number.
    amount: formatRate(rate.amountMinor, rate.currency) ?? `${rate.amountMinor} ${rate.currency}`,
    // "per week" reads as a sentence; beside a figure the design wants "/ week".
    per: (RATE_PERIOD_LABEL[rate.period] ?? rate.period).replace(/^per\s+/i, ''),
  }));
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
  // The first is the headline figure — the list arrives shortest period first
  // — and the rest sit under it, so a profile quoting an hour and a month says
  // both rather than picking one for the person.
  const [rate = null, ...otherRates] = readableRates(profile.rates);
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
  // Only the starred ones sit beside the name. Someone may list six languages
  // and work in two of them; the rest are still in the languages section below,
  // which is where a reader goes to find out.
  const languageLine = profile.languages
    .filter((language) => language.starred)
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
              <MediaThumb
                src={profile.avatarUrl}
                alt=""
                fallback={<LuUser aria-hidden="true" className="size-9 text-content-subtle" />}
              />
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
          <RateCard profile={profile} rate={rate} others={otherRates} stats={stats} />
          <WorkingPreferences profile={profile} />
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
              <Markdown source={profile.overview} className="mt-3 text-sm text-content-muted" />
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

          {/* Two short sections side by side on a wide screen, as the design
              has them: each is a handful of lines, and a full-width card for
              three of them leaves a column of white space beside the page. */}
          <div className="grid items-start gap-5 *:min-w-0 lg:grid-cols-2">
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
                      <CertificateFiles files={entry.files} name={entry.name} />
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

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
              <VideoIntro url={profile.videoIntroUrl} />
            </Card>
          )}

          {profile.portfolio.length === 0 ? null : (
            <Card title="Portfolio">
              <PortfolioTiles pieces={profile.portfolio} />
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
  others,
  stats,
}: {
  profile: PublicProfile;
  rate: { amount: string; per: string } | null;
  /** Every other period this profile quotes, shown under the headline figure. */
  others: { amount: string; per: string }[];
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
          {/* The shortest period this person quotes, named the way the design
              names it. "Typical" rather than "from": the list under it carries
              every other period, so the figure is not a teaser. */}
          <h2 className="text-sm text-content-muted">Typical rate</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="text-3xl font-bold break-all text-content-accent">{rate.amount}</span>
            <span className="text-sm text-content-subtle">/ {rate.per}</span>
          </p>
          {others.length === 0 ? null : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {others.map((other) => (
                <li
                  key={other.per}
                  className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-content-muted"
                >
                  <span className="font-medium text-content">{other.amount}</span> / {other.per}
                </li>
              ))}
            </ul>
          )}
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
/**
 * The scans and PDFs attached to one certification, as a reader sees them.
 *
 * The images are shown as thumbnails that open the full scan; documents are
 * links, the same way a portfolio piece renders its own — a certificate is
 * proof, so the point is that it can be looked at.
 */
function CertificateFiles({
  files,
  name,
}: {
  files: PublicProfile['licenses'][number]['files'];
  name: string;
}) {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <FileThumbGrid files={files} alt={name} />
      <FileDocuments files={files} fallbackName="Certificate" />
    </div>
  );
}

/**
 * The work, as a wall of it.
 *
 * Every picture gets a tile and a piece is named once, across the first of its
 * own — the same shape the owner sees on their profile, so the two views of one
 * portfolio are not two different components. A cover with "+5 more" on it is a
 * count of the work rather than the work, and somebody reading a portfolio came
 * to see all of it.
 *
 * The links and the documents follow the grid instead of sitting on a tile: a
 * case study is a thing to open, a tile is too small to say which file it is,
 * and a link inside a tile would cover the picture it sits on.
 */
function PortfolioTiles({ pieces }: { pieces: PublicProfile['portfolio'] }) {
  const documents = pieces.flatMap((piece) =>
    piece.files.filter((file) => file.kind === 'document'),
  );
  const linked = pieces.filter((piece) => (piece.url ?? '') !== '');

  return (
    <div className="mt-4 flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 *:min-w-0 sm:grid-cols-3 lg:grid-cols-4">
        {pieces.flatMap((piece, pieceIndex) => {
          const images = piece.files.filter((file) => file.kind === 'image');
          const summary = piece.summary ?? '';
          // A piece with nothing attached still has a name, so it keeps a tile
          // rather than disappearing from the page.
          const tiles: (PublicProfile['portfolio'][number]['files'][number] | undefined)[] =
            images.length === 0 ? [undefined] : images;

          return tiles.map((image, index) => (
            <li
              key={`piece-${pieceIndex}-${image?.objectKey ?? 'empty'}`}
              className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-muted"
            >
              {image === undefined ? (
                <span className="flex aspect-[4/3] w-full" />
              ) : (
                <FileCover file={image} alt={piece.title} />
              )}

              {/* `pointer-events-none` because the picture under it opens the
                  full-size copy, and a caption that swallows that press is a
                  tile that does nothing. */}
              {index > 0 || (piece.title === '' && summary === '') ? null : (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-inverse/85 to-transparent px-3 pt-8 pb-2.5">
                  <span className="block truncate text-sm font-semibold text-content-inverse">
                    {piece.title}
                  </span>
                  {summary === '' ? null : (
                    <span className="block truncate text-xs text-content-inverse/85">
                      {summary}
                    </span>
                  )}
                </span>
              )}
            </li>
          ));
        })}
      </ul>

      {linked.length === 0 ? null : (
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {linked.map((piece, index) => (
            <li key={`link-${index}`}>
              <a
                href={piece.url ?? ''}
                // A link on a public page to an address its owner typed:
                // `noopener` keeps the opened tab from reaching back through
                // `window.opener`, and `ugc` says this is not an endorsement.
                rel="noopener noreferrer ugc"
                target="_blank"
                className="inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm text-content-link underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LuExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                {piece.title === '' ? 'Visit the work' : piece.title}
              </a>
            </li>
          ))}
        </ul>
      )}

      <FileDocuments files={documents} fallbackName="Document" />
    </div>
  );
}

/**
 * What working together would look like, in the freelancer’s own words.
 *
 * Every line here was typed by the person whose profile this is — unlike the
 * card above it, which is the platform’s record of them — so it is phrased as
 * a preference rather than as a measurement. It used to be collected by the
 * profile form, stored, returned by the API and then dropped on the floor by
 * this screen: four questions answered for nobody.
 */
function WorkingPreferences({ profile }: { profile: PublicProfile }) {
  const rows = [
    profile.remoteMode === null
      ? null
      : { icon: LuMonitor, text: labelOfRemoteMode(profile.remoteMode) },
    profile.projectLength === null
      ? null
      : { icon: LuClock, text: phraseOfProjectLength(profile.projectLength) },
    profile.availableFrom === null
      ? null
      : { icon: LuCalendarDays, text: `Available from ${monthAndYear(profile.availableFrom)}` },
    profile.responseTime === null
      ? null
      : {
          icon: LuMessageSquare,
          text: `Usually replies ${labelOfResponseTime(profile.responseTime).toLowerCase()}`,
        },
  ].filter((row) => row !== null);

  if (rows.length === 0) return null;

  return (
    <Card title="Working preferences">
      <ul className="mt-4 flex flex-col gap-3 text-sm text-content-muted">
        {rows.map((row) => (
          <li key={row.text} className="flex items-start gap-2.5">
            <row.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-content-subtle" />
            <span className="min-w-0">{row.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** "2026-10-01" as "October 2026", without a timezone turning it into September. */
function monthAndYear(date: string): string {
  const [year, month] = date.split('-');
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const name = names[Number(month) - 1];
  return name === undefined || year === undefined ? date : `${name} ${year}`;
}

/**
 * The introduction, as something to press rather than a sentence about a video.
 *
 * Still a link out and not an embed — the address is the freelancer’s, and
 * framing someone else’s page is their decision, not ours — but a still from
 * the video is the thing the design puts here, and it is the difference between
 * a page that shows someone and a page that mentions them. The still comes from
 * the video host, so a link the host has no picture for falls back to the line
 * of text rather than to an empty frame.
 */
function VideoIntro({ url }: { url: string }) {
  const thumbnail = videoThumbnail(url);

  return (
    <a
      href={url}
      rel="nofollow noopener noreferrer"
      target="_blank"
      className="mt-4 flex flex-col gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-row sm:items-center"
    >
      {thumbnail === null ? null : (
        <span className="relative flex aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:w-64">
          <MediaThumb src={thumbnail} alt="" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface/90 shadow-sm">
              <LuPlay aria-hidden="true" className="size-5 translate-x-0.5 text-content-accent" />
            </span>
          </span>
        </span>
      )}

      <span className="inline-flex min-h-6 items-center gap-2 text-sm font-medium text-content-link underline underline-offset-4">
        <LuVideo aria-hidden="true" className="size-4 shrink-0" />
        Watch the introduction
      </span>
    </a>
  );
}
