import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown.tsx';

describe('Markdown', () => {
  it('renders bold, italics and both kinds of list', () => {
    const { container } = render(
      <Markdown source={'I am **bold** and _italic_.\n\n- one\n- two\n\n1. first\n2. second'} />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('never renders embedded HTML — a script is shown as text, not run', () => {
    const { container } = render(<Markdown source={'<script>alert(1)</script> hi'} />);
    // No element is created from the typed tag; its characters are just text.
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('does not turn a link into an anchor — links are not in the allowed set', () => {
    const { container } = render(
      <Markdown source={'[click](javascript:alert(1)) and <a href="x">x</a>'} />,
    );
    expect(container.querySelector('a')).toBeNull();
  });

  it('leaves a heading as plain text rather than a heading', () => {
    const { container } = render(<Markdown source={'# Not a heading'} />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.textContent).toContain('Not a heading');
  });
});
