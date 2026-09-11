'use client';

import { usePathname } from 'next/navigation';

/**
 * Screens whose frame draws the panel without the rule and the pill.
 *
 * Both frames still contain the two layers, but they sit beneath the blue panel
 * in the layer order, so what the design actually shows is a panel without
 * them. Matching the file means matching what it renders, not what it contains.
 */
const PLAIN_PANEL = new Set(['/sign-in', '/recover']);

/**
 * The white rule under the headline and the "Keep growing" pill.
 *
 * A client component only because the shared layout cannot know which screen
 * it is framing; everything else in the panel stays server-rendered.
 */
export function ShowcaseAccents() {
  const pathname = usePathname();
  if (PLAIN_PANEL.has(pathname)) return null;

  return (
    <>
      <span className="absolute top-[19.82%] left-[21.41%] h-[min(0.781cqh,1.044cqw)] w-[11.75%] bg-content-on-accent" />

      <span className="absolute top-[32.71%] left-[21.02%] inline-flex h-[min(3.809cqh,5.091cqw)] items-center rounded-full border border-white px-[min(2.390cqh,3.194cqw)] text-[min(1.718cqh,2.296cqw)] font-semibold text-white">
        Keep growing
      </span>
    </>
  );
}
