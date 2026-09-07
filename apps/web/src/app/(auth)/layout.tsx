import { Showcase } from './_components/showcase.tsx';
import { Wordmark } from './_components/wordmark.tsx';

/**
 * The split shell every auth screen shares: form on the left, marketing panel
 * on the right. The columns are the design's 674 / 766 split of its 1440px
 * frame; below `lg` the panel drops away and the form takes the full width.
 *
 * The content is anchored to the top, not centred: both the sign-up and sign-in
 * frames put the logo at y=54 and start the form at y=139 and y=293
 * respectively, leaving the slack at the bottom. Centring it instead opens a
 * gap under the logo that the file does not have.
 *
 * The design file starts the logo at x=60, the sign-in heading at x=96 and the
 * form at x=85 on the same screen. Those are three different left edges for one
 * column, so everything here shares the form's — the widest block, and the one
 * the eye actually reads the column from. It is centred rather than pinned at
 * 85px because below 1440px there is not room for both that inset and the
 * column's full 530px.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface-subtle lg:grid-cols-[674fr_766fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:py-[54px]">
        <div className="mx-auto flex w-full max-w-[530px] flex-1 flex-col">
          {/* The mark is 30px inside a 39px block in the file, so the block —
              not the mark — is what the 46px gap below is measured from. */}
          <div className="flex h-[39px] shrink-0 items-center">
            <Wordmark />
          </div>
          <main id="main-content" className="flex flex-col pt-[46px] pb-10">
            {children}
          </main>
        </div>
      </div>
      <Showcase />
    </div>
  );
}
