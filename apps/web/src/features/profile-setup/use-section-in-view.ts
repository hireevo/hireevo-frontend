'use client';

import { useEffect, useState } from 'react';
import { STEPS, sectionIdFor, type StepId } from './steps.ts';

/**
 * The section being read, for the step list to follow while the page scrolls.
 *
 * That is the first section crossing a thin band a fifth of the way down the
 * window. At the very end of the page it is the last section, which is often
 * too short to ever reach the band. `null` until anything has been measured —
 * and always where there is no IntersectionObserver.
 */
export function useSectionInView(enabled: boolean): StepId | null {
  const [inView, setInView] = useState<StepId | null>(null);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const crossing = new Set<StepId>();
    const last = STEPS[STEPS.length - 1];

    const pick = () => {
      const root = document.documentElement;
      if (
        last !== undefined &&
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= root.scrollHeight - 2
      ) {
        setInView(last.id);
        return;
      }
      const first = STEPS.find((step) => crossing.has(step.id));
      // Between two cards nothing crosses the band; the last answer still holds.
      if (first !== undefined) setInView(first.id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const step = STEPS.find((candidate) => sectionIdFor(candidate.id) === entry.target.id);
          if (step === undefined) continue;
          if (entry.isIntersecting) crossing.add(step.id);
          else crossing.delete(step.id);
        }
        pick();
      },
      { rootMargin: '-20% 0px -75% 0px' },
    );
    for (const step of STEPS) {
      const section = document.getElementById(sectionIdFor(step.id));
      if (section !== null) observer.observe(section);
    }
    window.addEventListener('scroll', pick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', pick);
    };
  }, [enabled]);

  return inView;
}
