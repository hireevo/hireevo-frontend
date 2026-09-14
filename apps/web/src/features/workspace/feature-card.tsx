import { useId } from 'react';
import type { IconType } from 'react-icons';
import { LuBriefcaseBusiness, LuCreditCard, LuFileText } from 'react-icons/lu';
import { Badge, Card } from '@hireevo/ui-web';
import { ActionLink } from './action-link.tsx';
import { EYEBROW } from './layout.ts';
import type { CardId, WorkspaceCard } from './types.ts';

const ICONS: Record<CardId, IconType> = {
  featured: LuBriefcaseBusiness,
  membership: LuCreditCard,
  posting: LuFileText,
};

export function FeatureCard({ card }: { card: WorkspaceCard }) {
  const headingId = useId();
  const Icon = ICONS[card.id];

  return (
    <Card aria-labelledby={headingId} className="border-l-4 border-border-accent p-5 sm:p-6">
      <div className="flex gap-4">
        {/* Decoration, dropped on phones where its 44px is a fifth of the card. */}
        <span
          aria-hidden="true"
          className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-content-link sm:flex"
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className={EYEBROW}>{card.eyebrow}</p>
            {card.status === null ? null : (
              <Badge tone={card.status.tone} variant={card.status.variant}>
                {card.status.label}
              </Badge>
            )}
          </div>
          <h2
            id={headingId}
            className="mt-2 text-xl leading-snug font-semibold text-balance text-content-accent sm:text-[1.375rem]"
          >
            {card.title}
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-content-subtle">
            {card.description}
          </p>
          {card.meta === null ? null : (
            <div className="mt-4">
              <Badge tone={card.meta.tone}>{card.meta.label}</Badge>
            </div>
          )}
          {card.action === null ? null : (
            <div className="mt-5">
              <ActionLink action={card.action} arrow className="text-base" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
