import { Showcase } from './_components/showcase.tsx';
import { Wordmark } from './_components/wordmark.tsx';

/**
 * The split shell every auth screen shares: form on the left, marketing panel
 * on the right, in the design's 674 / 766 split of its 1440px frame. Below `lg`
 * the panel drops away and the form takes the full width.
 *
 * On the split, the column keeps the frame's left edges as fractions of its own
 * width rather than being centred: the logo starts 60px in and the 530px form
 * 85px in, leaving 59px on the right. At 1440 those are the file's pixels; wider
 * or narrower they scale with the column instead of drifting to its middle.
 * (60 / 674 = 8.902%; the remaining 25px and 530px are 4.072% and 86.32% of the
 * 614px left after it.)
 *
 * The content is anchored to the top, not centred: every frame puts the logo at
 * y=54 and starts the content at y=139, leaving the slack at the bottom.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface-subtle lg:grid-cols-[674fr_766fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:py-[54px] lg:pr-0 lg:pl-[8.902%]">
        <div className="mx-auto flex w-full max-w-[530px] flex-1 flex-col lg:mx-0 lg:max-w-none">
          {/* The mark is 30px inside a 39px block in the file, so the block —
              not the mark — is what the 46px gap below is measured from. */}
          <div className="flex h-[39px] shrink-0 items-center">
            <Wordmark />
          </div>
          <main
            id="main-content"
            className="flex flex-col pt-[46px] pb-10 lg:ml-[4.072%] lg:w-[86.32%] lg:max-w-[530px]"
          >
            {children}
          </main>
        </div>
      </div>
      <Showcase />
    </div>
  );
}
