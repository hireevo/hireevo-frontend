import { LuPlus } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';

/** The "+ Add …" control every section opens with. */
export function AddButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="rounded-lg text-sm">
      <LuPlus aria-hidden="true" className="size-4" />
      {children}
    </Button>
  );
}
