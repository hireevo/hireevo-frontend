import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownEditor } from './markdown-editor.tsx';

// ProseMirror does not take keystrokes under jsdom, so this covers what a render
// can: the toolbar is offered and the editing region carries the field's label.
// Typing and formatting are verified where the editor is used and by rendering.
describe('MarkdownEditor', () => {
  it('renders the four formatting controls', () => {
    render(<MarkdownEditor id="bio" aria-label="Biography" value="" onChange={() => {}} />);
    for (const name of ['Bold', 'Italic', 'Bulleted list', 'Numbered list']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('gives the editing region the field label', async () => {
    render(<MarkdownEditor id="bio" aria-label="Biography" value="" onChange={() => {}} />);
    expect(await screen.findByRole('textbox', { name: 'Biography' })).toBeInTheDocument();
  });
});
