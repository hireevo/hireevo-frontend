import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VIDEO_URL_ERROR } from './video-url.ts';
import { VideoIntroEditor } from './video-intro-editor.tsx';

afterEach(cleanup);

/** Renders the editor and lets the test drive it, tracking what onChange sends. */
function open(url = '', fieldErrors: Record<string, string> = {}) {
  const onChange = vi.fn<(url: string) => void>();
  const view = render(<VideoIntroEditor url={url} fieldErrors={fieldErrors} onChange={onChange} />);
  const input = screen.getByRole('textbox', { name: /Link to your video/ });
  return { onChange, input, rerender: view.rerender };
}

describe('VideoIntroEditor', () => {
  it('says nothing while the field is empty, because the video is optional', () => {
    open('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['a link with no scheme', 'vimeo.com/123456789'],
    ['random text', 'my cool video'],
    ['a script URL', 'javascript:alert(1)'],
  ])('flags %s the moment it is in the field, not only on save', (_why, value) => {
    open(value);
    expect(screen.getByRole('alert')).toHaveTextContent(VIDEO_URL_ERROR);
    expect(screen.getByRole('textbox', { name: /Link to your video/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('sends each keystroke up so the parent stays the source of truth', async () => {
    const user = userEvent.setup();
    const { input, onChange } = open('');
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('clears the error the moment the link becomes a full https one', () => {
    const { rerender } = open('javascript:alert(1)');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <VideoIntroEditor url="https://vimeo.com/123456789" fieldErrors={{}} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server’s answer too', () => {
    open('https://vimeo.com/123456789', { videoIntroUrl: VIDEO_URL_ERROR });
    expect(screen.getByRole('alert')).toHaveTextContent(VIDEO_URL_ERROR);
  });
});
