import type { Metadata } from 'next';
import { Button } from '@hireevo/ui-web';
import { semanticPalette, theme } from '@hireevo/tokens';

export const metadata: Metadata = { title: 'Design system' };

const SURFACE_GROUPS = [
  { label: 'Surface', prefix: 'surface' },
  { label: 'Content', prefix: 'content' },
  { label: 'Border', prefix: 'border' },
  { label: 'Accent', prefix: 'accent' },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-md border border-border"
        style={{ background: `var(--he-${name})` }}
      />
      <span className="min-w-0">
        <span className="block truncate font-mono text-xs">--he-{name}</span>
        <span className="block font-mono text-xs text-content-subtle">{value}</span>
      </span>
    </div>
  );
}

export default function DesignSystemPage() {
  // The light palette supplies the names and the reference values printed
  // beside each swatch; the swatch itself renders the live custom property, so
  // switching the OS to dark shows the dark palette in the same grid.
  const palette = semanticPalette('light');

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Design system</h1>
        <p className="max-w-prose text-content-muted">
          Everything here is generated from <code className="font-mono">tokens.json</code>. Contrast
          for every documented pair is checked by{' '}
          <code className="font-mono">pnpm tokens:contrast</code>, not by eye.
        </p>
      </header>

      {SURFACE_GROUPS.map(({ label, prefix }) => (
        <Section key={prefix} title={`${label} colours`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(palette)
              .filter(([name]) => name === prefix || name.startsWith(`${prefix}-`))
              .map(([name, value]) => (
                <Swatch key={name} name={name} value={value} />
              ))}
          </div>
        </Section>
      ))}

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
      </Section>

      <Section title="Scales">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm sm:grid-cols-4">
          {Object.entries(theme.radius).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-2">
              <dt className="text-content-subtle">radius.{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          {Object.entries(theme.breakpoint).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-2">
              <dt className="text-content-subtle">bp.{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </main>
  );
}
