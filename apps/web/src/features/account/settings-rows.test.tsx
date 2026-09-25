import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotYet, RowAction, SettingRow } from './settings-rows.tsx';

/**
 * The two Edits a settings row can carry.
 *
 * They look identical on purpose — the design draws one control — so the thing
 * worth holding is the difference underneath: one opens something, and one
 * refuses and says why. A refusal that looked like a working control, or a
 * working control that had quietly become a refusal, would both read as "the
 * button does nothing" (§6.7).
 */
describe('a settings row', () => {
  it('opens what its Edit is for', () => {
    const opened = vi.fn();
    render(<SettingRow label="Password" action={<RowAction label="Edit" onClick={opened} />} />);

    screen.getByRole('button', { name: 'Edit' }).click();

    expect(opened).toHaveBeenCalledOnce();
  });

  it('shows a value under the label when there is one, and nothing when there is not', () => {
    const { rerender } = render(
      <SettingRow label="Connected devices" value="02" action={<span />} />,
    );
    expect(screen.getByText('02')).toBeInTheDocument();

    rerender(<SettingRow label="Password" action={<span />} />);
    expect(screen.queryByText('02')).not.toBeInTheDocument();
  });

  it('refuses an Edit with no endpoint behind it, and says so where it can be heard', () => {
    render(
      <SettingRow
        label="Two-factor authentication"
        value="Not set up yet"
        action={<NotYet label="Edit" reason="Two-factor authentication is not available yet." />}
      />,
    );

    const refused = screen.getByRole('button', { name: 'Edit' });
    expect(refused).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Two-factor authentication is not available yet.')).toBeInTheDocument();
    expect(refused).toHaveAttribute(
      'aria-describedby',
      screen.getByText('Two-factor authentication is not available yet.').id,
    );
  });
});
