'use client';

/**
 * The last line of defence: this replaces the root layout, so it cannot use the
 * app's fonts, providers or primitives. Styles are inline for the same reason —
 * the stylesheet may be exactly what failed to load.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: '#ffffff',
          color: '#1d2221',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>HireEvo is unavailable</h1>
          <p style={{ color: '#555e5c', lineHeight: 1.5 }}>
            The application failed to start. Please reload the page.
          </p>
          {error.digest === undefined ? null : (
            <p style={{ color: '#6c7674', fontFamily: 'ui-monospace, monospace' }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
