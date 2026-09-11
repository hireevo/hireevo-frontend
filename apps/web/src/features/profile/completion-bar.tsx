import { LuArrowRight } from 'react-icons/lu';
import { Button, Card, ProgressBar } from '@hireevo/ui-web';
import type { Completion } from './draft.ts';

export type CompletionBarProps = {
  completion: Completion;
  pending?: boolean;
  onContinue: () => void;
};

export function CompletionBar({ completion, pending = false, onContinue }: CompletionBarProps) {
  const { done, total, percent } = completion;

  return (
    <Card className="flex items-center gap-8 px-7 py-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="font-medium text-content">Profile {percent}% complete</span>
          <span className="shrink-0 text-content-subtle">
            {done} of {total} key steps
          </span>
        </div>
        <ProgressBar
          className="mt-3"
          value={percent}
          label="Profile completion"
          valueText={`${percent} percent complete, ${done} of ${total} key steps`}
        />
      </div>
      <Button type="button" size="lg" onClick={onContinue} loading={pending} className="shrink-0">
        Continue
        <LuArrowRight aria-hidden="true" className="size-5" />
      </Button>
    </Card>
  );
}
