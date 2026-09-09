/** A whole-form failure — the ones that belong to no single field. */
export function FormMessage({ children }: { children: React.ReactNode }) {
  if (children === null || children === undefined) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-border-danger bg-surface-danger-subtle px-3 py-2 text-sm text-content-danger"
    >
      {children}
    </p>
  );
}
