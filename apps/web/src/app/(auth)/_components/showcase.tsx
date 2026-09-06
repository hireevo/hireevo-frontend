import Image from 'next/image';

/**
 * The marketing panel beside every auth form.
 *
 * Positions are percentages of the design's 766 x 1024 panel, so the whole
 * composition scales with the column instead of drifting apart at widths the
 * design file never drew. The panel is decorative: it is hidden below `lg` and
 * carries nothing a user needs in order to sign in.
 *
 * The sign-in frame renders without the rule and the "Keep growing" pill, but
 * both are present in it at the same coordinates as every other frame — they
 * are simply stacked under the photograph. That is layer order, not intent, so
 * the panel is the same on all four screens.
 */
export function Showcase() {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-surface-accent select-none lg:block"
    >
      {/* The lightened sweep across the upper right. In the file this is a
          1074px circle hanging off the top-right corner. */}
      <span className="absolute top-[-25.49%] left-[47.26%] h-[104.5%] w-[140.3%] rounded-full bg-white/10" />

      {/* Stepped corner marks, cut out of the panel in Figma. Decorative, so an
          empty alt keeps them silent — and invisible until they are exported. */}
      <Image
        src="/auth/brand-motif.svg"
        alt=""
        width={417}
        height={367}
        unoptimized
        className="absolute top-0 right-0 w-[54.5%]"
      />
      <Image
        src="/auth/brand-motif-alt.svg"
        alt=""
        width={262}
        height={432}
        unoptimized
        className="absolute bottom-0 left-0 w-[34.2%]"
      />

      <p className="absolute top-[4.3%] left-[20.5%] text-[3.5rem] leading-[1.18] font-bold tracking-tight text-content-on-accent">
        Work
        <br />
        your way.
      </p>

      <span className="absolute top-[19.82%] left-[21.41%] h-2 w-[90px] rounded-full bg-content-on-accent" />

      <p className="absolute top-[23.83%] left-[21.15%] text-[1.1875rem] leading-[1.21] text-content-on-accent">
        Your Work Space
        <br />
        Your success
      </p>

      <span className="absolute top-[32.71%] left-[21.02%] inline-flex h-[39px] items-center rounded-full border border-content-on-accent px-6 text-[0.8125rem] text-content-on-accent">
        Keep growing
      </span>

      <Image
        src="/auth/workspace.png"
        alt=""
        width={574}
        height={861}
        priority
        className="absolute top-[16.99%] left-[16.06%] w-[74.93%]"
      />

      {/* Carousel affordance from the design. Nothing is wired to it yet, so it
          is a static indicator rather than a control that does nothing. */}
      <span className="absolute top-[93.36%] left-1/2 flex -translate-x-1/2 items-center gap-[18px]">
        <span className="size-[5px] rounded-full bg-white/40" />
        <span className="size-2 rounded-full bg-content-on-accent" />
        <span className="size-[5px] rounded-full bg-white/40" />
      </span>
    </aside>
  );
}
