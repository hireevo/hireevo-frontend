import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FileDocuments, FileThumbGrid, type StoredFile } from './file-gallery.tsx';
import { MediaThumb } from './media-thumb.tsx';

const image: StoredFile = {
  kind: 'image',
  url: 'https://media.example.com/full.webp',
  thumbUrl: 'https://media.example.com/thumb.webp',
  objectKey: 'profiles/p1/portfolio/one.webp',
  fileName: 'kitchen.png',
};

const pdf: StoredFile = {
  kind: 'document',
  url: 'https://media.example.com/case-study.pdf',
  thumbUrl: null,
  objectKey: 'profiles/p1/portfolio/case-study.pdf',
  fileName: 'Case study.pdf',
};

describe('an image that does not arrive', () => {
  it('says which file is missing instead of leaving a broken picture', () => {
    render(<MediaThumb src={image.thumbUrl} alt="Kitchen redesign" fileName={image.fileName} />);

    // Before the failure it is an ordinary image.
    const img = screen.getByRole('img', { name: 'Kitchen redesign' });
    expect(img).toHaveAttribute('src', 'https://media.example.com/thumb.webp');

    // Storage is unreachable, the CDN edge is cold, the phone lost its
    // connection — whatever the reason, the page must not read as broken.
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('kitchen.png')).toBeInTheDocument();
    expect(screen.getByText('Preview could not be loaded')).toBeInTheDocument();
  });

  it('shows what the caller asked for instead, where there is something better', () => {
    render(<MediaThumb src={null} alt="" fallback={<span>No photo yet</span>} />);

    expect(screen.getByText('No photo yet')).toBeInTheDocument();
    expect(screen.queryByText('Preview could not be loaded')).not.toBeInTheDocument();
  });
});

describe('the documents attached to a record', () => {
  it('opens one in the page, rather than only naming it', async () => {
    const user = userEvent.setup();
    render(<FileDocuments files={[pdf]} fallbackName="Certificate" />);

    await user.click(screen.getByRole('button', { name: /Case study\.pdf/ }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Case study.pdf' })).toBeInTheDocument();
    // The document itself, not a promise that it exists somewhere.
    expect(dialog.getByTitle('Case study.pdf')).toHaveAttribute(
      'src',
      'https://media.example.com/case-study.pdf',
    );
    // And the file, for anyone who wants it in a tab of its own.
    expect(dialog.getByRole('link', { name: /Open in a new tab/ })).toHaveAttribute(
      'href',
      'https://media.example.com/case-study.pdf',
    );
  });

  it('closes on Escape, putting focus back where it was', async () => {
    const user = userEvent.setup();
    render(<FileDocuments files={[pdf]} fallbackName="Certificate" />);

    const opener = screen.getByRole('button', { name: /Case study\.pdf/ });
    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('the images attached to a record', () => {
  it('opens the full one in the page', async () => {
    const user = userEvent.setup();
    render(<FileThumbGrid files={[image, pdf]} alt="Kitchen redesign" />);

    // The PDF is not in the grid — it is not an image.
    expect(screen.getAllByRole('button')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Open kitchen\.png/ }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('img', { name: 'kitchen.png' })).toHaveAttribute(
      'src',
      'https://media.example.com/full.webp',
    );
  });
});
