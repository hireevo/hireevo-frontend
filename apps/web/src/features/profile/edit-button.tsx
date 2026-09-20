import { LuPencil } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';

/**
 * The control that opens a section someone has already filled in.
 *
 * Hidden until "Complete your profile" turns editing on: a finished profile is
 * mostly read rather than edited, and a pencil on every section makes the page
 * look like a form when it is meant to look like the profile a buyer sees.
 *
 * The name is set rather than assembled from the visible word and a hidden one:
 * eight identical "Edit" buttons down a page tell a screen reader nothing about
 * which section each one opens.
 */
export function EditButton({ onClick, section }: { onClick: () => void; section: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-label={`Edit ${section}`}
      className="rounded-lg"
    >
      <LuPencil aria-hidden="true" className="size-3.5" />
      Edit
    </Button>
  );
}
