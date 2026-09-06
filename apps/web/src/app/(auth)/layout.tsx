import { Showcase } from './_components/showcase.tsx';
import { Wordmark } from './_components/wordmark.tsx';

/**
 * The split shell every auth screen shares: form on the left, marketing panel
 * on the right. The columns are the design's 674 / 766 split of its 1440px
 * frame; below `lg` the panel drops away and the form takes the full width.
 *
 * The design file starts the logo at x=60, the headings at x=96 and the form at
 * x=85 on the same screen. Those are three different left edges for one column,
 * so everything here shares the form's — the widest block, and the one the eye
 * actually reads the column from.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface-subtle lg:grid-cols-[674fr_766fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:py-[54px]">
        <div className="mx-auto flex w-full max-w-[530px] flex-1 flex-col">
          <Wordmark />
          <main id="main-content" className="flex flex-1 flex-col justify-center py-10">
            {children}
          </main>
        </div>
      </div>
      <Showcase />
    </div>
  );
}
