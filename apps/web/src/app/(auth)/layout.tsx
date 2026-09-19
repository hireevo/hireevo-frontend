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
 *
 * Those are the numbers for a 1024px-tall window, and a laptop browser is nearer
 * 630px — at the file's spacing sign-in needed 860px and left its button below
 * the fold. So every vertical gap here and in the screens eases from the file's
 * value down to a compact one as the window gets shorter (`--fit`, in
 * globals.css), while widths and horizontal offsets stay exactly as drawn. The
 * panel is pinned to the window rather than stretched to the form, so a long
 * form scrolls past a photograph that stays whole.
 *
 * Past 2000px the fractions stop helping: a 530px form 12% into a 1,200px
 * column hugs the left with most of the column empty beside it. There the
 * column is centred instead, keeping the frame's 25px between logo and form.
 *
 * The tracks are `minmax(0, …)`, and the form cell `min-w-0`, because a grid
 * track's default minimum is its content's minimum width — and Firefox counts a
 * text input's intrinsic width in that, which pushed a 320px phone 58px sideways.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-rhythm grid min-h-dvh grid-cols-1 bg-surface-subtle lg:grid-cols-[minmax(0,674fr)_minmax(0,766fr)]">
      <div className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:pt-[calc(24px+0.3*var(--fit))] lg:pr-0 lg:pb-[calc(24px+0.16*var(--fit))] lg:pl-[8.902%] min-[2000px]:pl-0">
        <div className="mx-auto flex w-full max-w-[530px] flex-1 flex-col lg:mx-0 lg:max-w-none min-[2000px]:mx-auto min-[2000px]:max-w-[555px]">
          {/* The mark is 30px inside a 39px block in the file, so the block —
              not the mark — is what the 46px gap below is measured from. */}
          <div className="flex h-[39px] shrink-0 items-center">
            <Wordmark />
          </div>
          <main
            id="main-content"
            className="flex flex-1 flex-col pt-[calc(20px+0.26*var(--fit))] pb-10 lg:ml-[4.072%] lg:pb-0 lg:w-[86.32%] lg:max-w-[530px] min-[2000px]:ml-[25px] min-[2000px]:w-[530px]"
          >
            {children}
          </main>
        </div>
      </div>
      <Showcase />
    </div>
  );
}
