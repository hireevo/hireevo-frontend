import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

/**
 * The heading every settings screen wears, and the way back to the list.
 *
 * One copy rather than one per screen: the way back is the part that has to be
 * identical, and four hand-written versions of it is how one of them ends up
 * pointing somewhere else.
 */
export function AccountHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/account"
        className="inline-flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-content-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <LuArrowLeft aria-hidden="true" className="size-4" />
        Account settings
      </Link>

      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-content-accent sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 text-base text-content-subtle">{description}</p>
      </div>
    </div>
  );
}
