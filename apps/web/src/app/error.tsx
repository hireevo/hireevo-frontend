'use client';

import { useEffect } from 'react';
import { Button } from '@hireevo/ui-web';

/**
 * Recovers a single route segment. The message is deliberately generic: an
 * error string can carry a request id or a field name from the API, and neither
 * belongs on screen.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by the reporter wired up in instrumentation.ts. Until then the
    // digest is the only handle on what happened, and it is already in the
    // server logs.
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-content-muted">
        The page could not be loaded. Trying again often resolves it; if it does not, the reference
        below helps support find the failure.
      </p>
      {error.digest === undefined ? null : (
        <p className="font-mono text-sm text-content-subtle">Reference: {error.digest}</p>
      )}
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
