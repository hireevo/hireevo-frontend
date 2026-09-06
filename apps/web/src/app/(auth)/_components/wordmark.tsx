import Image from 'next/image';

/**
 * The HireEvo wordmark. The file is exported from Figma rather than redrawn —
 * see `public/brand/README.md` — so the mark stays identical to the one design
 * ships everywhere else.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/hireevo-logo.svg"
      alt="HireEvo"
      width={125}
      height={30}
      priority
      unoptimized
      {...(className === undefined ? {} : { className })}
    />
  );
}
