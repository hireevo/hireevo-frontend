/**
 * Liveness for the container orchestrator. It checks nothing external on
 * purpose: a blip in the API must not restart a healthy web pod. Readiness,
 * once there is anything to be ready for, gets its own route.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', uptime: Math.round(process.uptime()) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
