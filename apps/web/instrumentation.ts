/**
 * Runs once per server process, before any request is handled. This is where
 * the error reporter and tracing exporter are registered, so that a failure
 * during startup is still captured. It is deliberately empty rather than
 * absent: adding observability later should be an edit to one known file, not a
 * search for where it belongs.
 */
export function register(): void {
  // Intentionally empty. See docs/adr when the reporter is chosen.
}

/**
 * Called for every uncaught server-side error, including ones thrown while
 * streaming a response — which `error.tsx` never sees.
 */
export function onRequestError(): void {
  // Intentionally empty.
}
