'use client';

import { useLayoutEffect, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

type AutoGrowTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & {
  value: string;
  /** Past this height it scrolls instead, so a 5,000-character biography does not take the page. */
  maxHeight: number;
};

/**
 * A textarea as tall as what is in it.
 *
 * A fixed number of rows cut text off on narrow screens: a headline that fits
 * two lines at 1536px takes three at 768px, and the third line sat hidden
 * behind a scrollbar nobody expects in a two-line field. It re-measures when
 * the text changes and when its column changes width.
 */
export function AutoGrowTextarea({ value, maxHeight, ...props }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const fit = () => {
      element.style.height = 'auto';
      // scrollHeight excludes the border; the 2px puts the 1px top and bottom back.
      const wanted = element.scrollHeight + 2;
      element.style.height = `${Math.min(wanted, maxHeight)}px`;
      element.style.overflowY = wanted > maxHeight ? 'auto' : 'hidden';
    };

    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, [value, maxHeight]);

  return <textarea ref={ref} value={value} {...props} />;
}
