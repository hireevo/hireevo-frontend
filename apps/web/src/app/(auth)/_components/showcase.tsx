import Image from 'next/image';

/**
 * The marketing panel beside every auth form.
 *
 * Everything is a fraction of the design's 766 x 1024 panel: the offsets as
 * percentages, the type against the panel's own container. Two details there
 * matter more than they look.
 *
 * The type is sized in `cqh`, the same axis the vertical offsets use. Sizing by
 * width while positioning by height only agrees at the design's own aspect
 * ratio: at 1920x1080 the headline grew past the rule beneath it and the two
 * overlapped.
 *
 * And each size is `min()`ed against the width-derived equivalent, so a panel
 * that is tall and narrow — a portrait tablet — cannot inflate the type until
 * the headline wraps. Width only ever makes it smaller, which only ever opens
 * the gaps further. At 766 x 1024 both terms agree and it is the file's pixels.
 *
 * The stepped white marks along the edges are not overlays: in Figma the panel
 * is a rectangle with those notches subtracted from it, so what shows through
 * them is the page behind. `panel.svg` is that shape, which is why the element
 * under it carries the page colour rather than the brand navy.
 *
 * The panel is decorative: it is hidden below `lg` and carries nothing a user
 * needs in order to sign in. Layer order follows the file — the photograph sits
 * over the headline, and the rule and pill sit over the photograph.
 */
export function Showcase() {
  return (
    // `container-type: size` rather than Tailwind's `@container`, which is
    // inline-size only: `cqh` needs the block axis to be queryable too. The panel
    // is a grid cell with a definite height, so containing its size costs nothing.
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-surface-subtle select-none [container-type:size] lg:block"
    >
      <Image
        src="/auth/panel.svg"
        alt=""
        fill
        priority
        unoptimized
        // The export is `preserveAspectRatio="none"`, so the notches stretch
        // with the column exactly as they do when the frame is resized.
        className="object-fill"
      />

      {/* The lightened sweep: a 803px ellipse, rotated, hanging off the top. */}
      <Image
        src="/auth/panel-glow.svg"
        alt=""
        width={803}
        height={793}
        unoptimized
        className="absolute top-[-25.49%] left-[0.52%] h-[104.49%] w-[140.29%] max-w-none rotate-[26.84deg]"
      />

      {/* The same stepped mark again, faint, over the top-right corner. */}
      <Image
        src="/auth/panel-motif.svg"
        alt=""
        width={417}
        height={367}
        unoptimized
        className="absolute top-0 right-0 w-[54.5%] -scale-x-100 opacity-10"
      />

      <p className="absolute top-[4.3%] left-[20.5%] text-[min(6.445cqh,8.616cqw)] leading-none font-extrabold text-content-on-accent">
        Work
        <br />
        your way.
      </p>

      <p className="absolute top-[23.83%] left-[21.15%] text-[min(2.246cqh,3.003cqw)] leading-[0.74] font-semibold text-[#cfd9e0]">
        Your Work Space
        <span className="mt-[min(1.172cqh,1.566cqw)] block">Your success</span>
      </p>

      <Image
        src="/auth/workspace.png"
        alt=""
        width={574}
        height={861}
        priority
        className="absolute top-[16.99%] left-[16.06%] w-[74.93%]"
      />

      <span className="absolute top-[19.82%] left-[21.41%] h-[min(0.781cqh,1.044cqw)] w-[11.75%] bg-content-on-accent" />

      <span className="absolute top-[32.71%] left-[21.02%] inline-flex h-[min(3.809cqh,5.091cqw)] items-center rounded-full border border-white px-[min(2.390cqh,3.194cqw)] text-[min(1.718cqh,2.296cqw)] font-semibold text-white">
        Keep growing
      </span>

      {/* Carousel affordance from the design. Nothing is wired to it yet, so it
          is a static indicator rather than a control that does nothing. */}
      <Image
        src="/auth/carousel.svg"
        alt=""
        width={54}
        height={8}
        unoptimized
        className="absolute top-[93.36%] left-[51.06%] w-[7.09%]"
      />
    </aside>
  );
}
