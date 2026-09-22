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
  it('says nothing while a link is still being typed', async () => {
    const user = userEvent.setup();
    const { input } = open();

    await user.type(input, 'https:/');
    // No blur yet: a half-typed link is not a mistake to shout about.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a link with no scheme once the person leaves the field', async () => {
    const user = userEvent.setup();
    const { input } = open('vimeo.com/123456789');

    await user.click(input);
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(VIDEO_URL_ERROR);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the error the moment the link becomes a full https one', async () => {
    const user = userEvent.setup();
    const { input, rerender } = open('javascript:alert(1)');

    await user.click(input);
    await user.tab();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <VideoIntroEditor url="https://vimeo.com/123456789" fieldErrors={{}} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server’s answer even before the field is touched', () => {
    open('https://vimeo.com/123456789', { videoIntroUrl: VIDEO_URL_ERROR });
    expect(screen.getByRole('alert')).toHaveTextContent(VIDEO_URL_ERROR);
  });
});
