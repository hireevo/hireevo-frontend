/**
 * The default skeleton for a route that is still streaming. It is
 * `aria-hidden` with a live-region label beside it, so a screen reader hears
 * "Loading" once rather than reading out a wall of placeholder blocks.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-surface-muted" />
      </div>
    </div>
  );
}
