'use client';

import Image from 'next/image';
import { useId } from 'react';
import {
  LuAward,
  LuBriefcaseBusiness,
  LuClock,
  LuEyeOff,
  LuFileText,
  LuGlobe,
  LuMapPin,
  LuMessageSquare,
  LuPlay,
} from 'react-icons/lu';
import { Card, Chip, cn } from '@hireevo/ui-web';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import {
  RATE_PERIOD_SHORT,
  countryByCode,
  formatRate,
} from '@/features/profile-setup/location-options.ts';
import {
  labelOfProjectLength,
  labelOfRemoteMode,
  labelOfResponseTime,
} from './working-preferences-editor.tsx';

type Sections = OwnProfile['sections'];
type Visibility = OwnProfile['visibility']['sections'];

/** A month and year, as the design dates a role: "Mar 2023". */
function monthYear(day: string | null): string | null {
  if (day === null) return null;
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "Mar 2023 – Present", the way work history reads. */
function span(start: string | null, end: string | null): string | null {
  const from = monthYear(start);
  const to = monthYear(end);
  if (from === null && to === null) return null;
  return `${from ?? '—'} – ${to ?? 'Present'}`;
}

const yearOf = (day: string | null): string | null => day?.slice(0, 4) ?? null;

/** Words joined the way the design writes a subtitle: "Coursera • 2021". */
const joined = (parts: (string | null | undefined)[], separator = ' • '): string =>
  parts.filter((part) => part !== null && part !== undefined && part !== '').join(separator);

/**
 * One card of the preview.
 *
 * Every card carries whether a buyer can see it, because that is the question
 * this page exists to answer and the answer is not visible anywhere else: the
 * section is filled in either way, and only the visibility settings decide
 * whether a stranger reading the profile is shown it.
 */
function PreviewCard({
  title,
  shown,
  children,
  className,
}: {
  title: string;
  shown: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = useId();

  return (
    // Named, so each card is a landmark someone can jump between rather than
    // one long page with no structure in it.
    <Card aria-labelledby={headingId} className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={headingId} className="text-lg font-bold text-content-accent">
          {title}
        </h2>
        {shown ? null : (
          <span className="inline-flex items-center gap-1.5 text-xs text-content-subtle">
            <LuEyeOff aria-hidden="true" className="size-3.5 shrink-0" />
            Hidden from buyers
          </span>
        )}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </Card>
  );
}

/**
 * The owner's profile as it reads once it is filled in — everything they
 * entered, in the order the design lays it out, and nothing to edit.
 *
 * Read from `/profiles/me` rather than from the public serializer, because the
 * question this page answers is "is all of my work here", and a section left
 * private would otherwise be missing with no way to tell that from a section
 * that never saved. What a buyer would not see is marked instead, which says
 * both things at once.
 */
export function ProfilePreviewScreen({
  profile,
  username,
}: {
  profile: OwnProfile;
  username: string | null;
}) {
  const sections: Sections = profile.sections;
  const shown: Visibility = profile.visibility.sections;
  const starred = sections.languages.filter((language) => language.starred);
  const country = countryByCode(profile.locationCountry)?.name ?? profile.locationCountry;
  const location = joined([profile.locationCity, profile.locationRegion, country], ', ');

  const rates = profile.rates.map((rate) => ({
    period: rate.period,
    amount: formatRate(rate.amountMinor, rate.currency) ?? `${rate.amountMinor} ${rate.currency}`,
    short: RATE_PERIOD_SHORT[rate.period] ?? rate.period,
  }));
  const [headline = null, ...otherRates] = rates;

  return (
    // One grid rather than two columns side by side, so the name can sit above
    // the profile while the terms column runs the full height beside it — the
    // way the design draws it. The three children are placed explicitly from
    // `lg`; below it the grid is one column and they read in DOM order, which
    // is "name → what it costs → the rest": what somebody scrolling wants.
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_338px] lg:items-start lg:gap-8">
      <Card
        aria-label="Name and details"
        data-slot="identity"
        className="flex flex-wrap items-start gap-x-6 gap-y-4 sm:flex-nowrap lg:col-start-1 lg:row-start-1"
      >
        {profile.avatarUrl === null ? (
          <div aria-hidden="true" className="size-20 shrink-0 rounded-full bg-surface-subtle" />
        ) : (
          <Image
            src={profile.avatarUrl}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="size-20 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-[1.375rem] leading-8 font-bold text-content-accent">
              {profile.displayName ?? 'Your name'}
            </h1>
            {username === null ? null : (
              <span className="text-base text-content-subtle">@{username}</span>
            )}
          </div>

          {profile.headline === null ? null : (
            <p className="mt-0.5 text-sm text-content-muted">{profile.headline}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {location === '' ? null : (
              <span className="inline-flex min-w-0 items-center gap-1 text-sm text-content-muted">
                <LuMapPin aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
                <span className="min-w-0">{location}</span>
              </span>
            )}
            {starred.length === 0 ? null : (
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <LuGlobe aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
                {starred.map((language) => (
                  <Chip key={language.name}>
                    {language.name}
                    {language.proficiency === null ? null : ` · ${language.proficiency}`}
                  </Chip>
                ))}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* What it costs and how this person works: the column a buyer decides
          from, beside the name from `lg` and straight under it on a phone. */}
      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {headline === null && profile.responseTime === null ? null : (
          <Card aria-label="Rates and response time" className="flex min-w-0 flex-col">
            {headline === null ? null : (
              <>
                <p className="text-xs font-medium tracking-wide text-content-subtle uppercase">
                  {/* The stored period is already the adjective the design
                      wants — "Typical hourly rate" — where the sentence form
                      would read "Typical hour rate". */}
                  Typical {headline.period} rate
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-3xl font-bold break-all text-content-accent">
                    {headline.amount}
                  </span>
                  <span className="text-sm text-content-subtle">{headline.short}</span>
                </p>
                {otherRates.length === 0 ? null : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {otherRates.map((rate) => (
                      <li
                        key={rate.period}
                        className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-content-muted"
                      >
                        <span className="font-medium text-content">{rate.amount}</span> {rate.short}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {profile.responseTime === null ? null : (
              <p
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 text-sm text-content-muted',
                  headline === null ? '' : 'mt-5 border-t border-border-subtle pt-5',
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <LuMessageSquare aria-hidden="true" className="size-4 text-content-subtle" />
                  Usually responds
                </span>
                <span className="font-semibold text-content-accent">
                  {labelOfResponseTime(profile.responseTime).toLowerCase()}
                </span>
              </p>
            )}
          </Card>
        )}

        {profile.remoteMode === null &&
        profile.projectLength === null &&
        profile.availableFrom === null ? null : (
          <Card aria-label="Working preferences" className="flex min-w-0 flex-col">
            <h2 className="text-lg font-bold text-content-accent">Working preferences</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-content-muted">
              {profile.remoteMode === null ? null : (
                <li className="flex items-center gap-2.5">
                  <LuGlobe aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
                  {labelOfRemoteMode(profile.remoteMode)}
                </li>
              )}
              {profile.projectLength === null ? null : (
                <li className="flex items-center gap-2.5">
                  <LuClock aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
                  {labelOfProjectLength(profile.projectLength)} projects
                </li>
              )}
              {profile.availableFrom === null ? null : (
                <li className="flex items-center gap-2.5">
                  <LuBriefcaseBusiness
                    aria-hidden="true"
                    className="size-4 shrink-0 text-content-subtle"
                  />
                  Available from {monthYear(profile.availableFrom)}
                </li>
              )}
            </ul>
          </Card>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
        {profile.overview === null ? null : (
          <PreviewCard title="About" shown={shown.biography}>
            <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">
              {profile.overview}
            </p>
          </PreviewCard>
        )}

        {sections.skills.length === 0 ? null : (
          <PreviewCard title="Skills and expertise" shown={shown.skills}>
            <ul className="flex flex-wrap gap-2">
              {sections.skills.map((skill) => (
                <li key={skill.name}>
                  <Chip>{skill.name}</Chip>
                </li>
              ))}
            </ul>
          </PreviewCard>
        )}

        {sections.experience.length === 0 ? null : (
          <PreviewCard title="Work experience" shown={shown.experience}>
            <ul className="flex flex-col gap-4">
              {sections.experience.map((role, index) => (
                <li
                  key={`${role.role}-${index}`}
                  className="min-w-0 rounded-lg bg-surface-subtle p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-content-subtle">
                      <LuBriefcaseBusiness aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-content-accent">{role.role}</p>
                      <p className="mt-0.5 text-sm text-content-muted">
                        {joined([role.organization, span(role.startDate, role.endDate)], ' · ')}
                      </p>
                      {role.summary === null ? null : (
                        <p className="mt-2 text-sm leading-[1.6] text-content-subtle">
                          {role.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </PreviewCard>
        )}

        {/* Two sections side by side where there is room, as the design draws
            them, and stacked below `md` where two columns would leave neither
            wide enough to read. */}
        {sections.education.length + sections.licenses.length === 0 ? null : (
          <div className="grid min-w-0 gap-6 md:grid-cols-2">
            {sections.education.length === 0 ? null : (
              <PreviewCard title="Education" shown={shown.education}>
                <ul className="flex flex-col gap-4">
                  {sections.education.map((course, index) => (
                    <li key={`${course.institution}-${index}`} className="min-w-0">
                      <p className="font-semibold text-content-accent">
                        {joined([course.qualification, course.fieldOfStudy], ' in ') ||
                          course.institution}
                      </p>
                      <p className="mt-0.5 text-sm text-content-accent">{course.institution}</p>
                      <p className="mt-0.5 text-sm text-content-subtle">
                        {yearOf(course.endDate) === null
                          ? span(course.startDate, course.endDate)
                          : `Graduated ${yearOf(course.endDate)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </PreviewCard>
            )}

            {sections.licenses.length === 0 ? null : (
              <PreviewCard title="Certifications" shown={shown.licenses}>
                <ul className="flex flex-col gap-4">
                  {sections.licenses.map((license, index) => (
                    <li key={`${license.name}-${index}`} className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-accent-subtle text-content-accent">
                        <LuAward aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-content-accent">{license.name}</p>
                        <p className="mt-0.5 text-sm text-content-subtle">
                          {joined([license.issuer, yearOf(license.issuedOn)])}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </PreviewCard>
            )}
          </div>
        )}

        {sections.portfolio.length === 0 ? null : (
          <PreviewCard title="Portfolio" shown={shown.portfolio}>
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sections.portfolio.map((piece, index) => {
                const cover = piece.files.find((file) => file.kind === 'image');
                const documents = piece.files.filter((file) => file.kind === 'document');
                return (
                  <li
                    key={`${piece.title}-${index}`}
                    className="min-w-0 overflow-hidden rounded-lg bg-surface-subtle"
                  >
                    <div className="relative aspect-[4/3] w-full max-w-full bg-surface">
                      {cover === undefined ? (
                        <span className="flex size-full items-center justify-center text-content-subtle">
                          <LuFileText aria-hidden="true" className="size-6" />
                        </span>
                      ) : (
                        <Image
                          src={cover.thumbUrl ?? cover.url}
                          alt=""
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 220px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-content-accent">
                        {piece.title}
                      </p>
                      {piece.summary === null ? null : (
                        <p className="mt-0.5 line-clamp-2 text-xs text-content-subtle">
                          {piece.summary}
                        </p>
                      )}
                      {documents.length === 0 ? null : (
                        <p className="mt-1 text-xs text-content-subtle">
                          {documents.length} document{documents.length === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </PreviewCard>
        )}

        {profile.videoIntroUrl === null ? null : (
          <PreviewCard title="Video intro" shown={shown.videoIntro}>
            <a
              href={profile.videoIntroUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-3 text-sm text-content-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-accent-subtle">
                <LuPlay aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 break-all">{profile.videoIntroUrl}</span>
            </a>
          </PreviewCard>
        )}

        {sections.languages.length === 0 ? null : (
          <PreviewCard title="Languages" shown={shown.languages}>
            <ul className="flex flex-wrap gap-2">
              {sections.languages.map((language) => (
                <li key={language.name}>
                  <Chip>
                    {language.name}
                    {language.proficiency === null ? null : ` — ${language.proficiency}`}
                  </Chip>
                </li>
              ))}
            </ul>
          </PreviewCard>
        )}

        {rates.length === 0 ? null : (
          <PreviewCard title="Expected rates" shown={shown.rate}>
            <p className="text-sm text-content-subtle">
              Your price is visible only in the sections you mark public — contact details stay
              private.
            </p>
            <div className="mt-4 rounded-lg bg-surface-subtle p-5">
              <p className="text-xs font-medium tracking-wide text-content-subtle uppercase">
                How buyers see this
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {rates.map((rate) => (
                  <li
                    key={rate.period}
                    className="rounded-full bg-surface px-3 py-1.5 text-sm text-content-muted"
                  >
                    <span className="font-semibold text-content-accent">{rate.amount}</span>{' '}
                    {rate.short}
                  </li>
                ))}
              </ul>
            </div>
          </PreviewCard>
        )}
      </div>
    </div>
  );
}
