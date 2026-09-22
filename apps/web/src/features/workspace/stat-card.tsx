import type { IconType } from 'react-icons';
import { LuAward, LuBadgeCheck, LuBriefcaseBusiness, LuTrendingUp } from 'react-icons/lu';
import { Badge, Card } from '@hireevo/ui-web';
import type { Stat, StatId } from './types.ts';

const ICONS: Record<StatId, IconType> = {
  skills: LuAward,
  portfolio: LuBriefcaseBusiness,
  certifications: LuBadgeCheck,
};

export function StatCard({ stat }: { stat: Stat }) {
  const Icon = ICONS[stat.id];

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      {/* Wraps rather than squeezing: between 768px and 1024px three cards
          share the row, and "Ready to publish" beside the icon does not fit. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-content-link"
        >
          <Icon className="size-[1.125rem]" />
        </span>
        {stat.trend === null ? null : <Badge icon={<LuTrendingUp />}>{stat.trend}</Badge>}
      </div>
      {/* The number is drawn large and first, but read as "0 Skills" — the
          visible order would announce a bare "0" with no subject. */}
      <p aria-hidden="true" className="mt-4 text-[2.5rem] leading-none font-bold text-content-link">
        {stat.value}
      </p>
      <p className="mt-4 text-base text-content-subtle">
        <span className="sr-only">{stat.value} </span>
        {stat.label}
      </p>
    </Card>
  );
}
