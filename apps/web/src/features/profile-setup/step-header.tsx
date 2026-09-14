export function StepHeader({
  id,
  number,
  title,
  description,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-accent-subtle text-sm font-semibold text-content-link"
      >
        {number}
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-xl leading-snug font-semibold text-content">
          <span className="sr-only">Step {number}: </span>
          {title}
        </h2>
        <p className="mt-1 text-sm text-content-subtle">{description}</p>
      </div>
    </div>
  );
}
