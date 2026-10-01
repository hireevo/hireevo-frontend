import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillCombobox } from './skill-combobox.tsx';

const client = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

const reply = (...names: string[]) => ({
  data: { skills: names.map((name) => ({ slug: name.toLowerCase(), name, category: null })) },
  error: undefined,
});

/** The field as the editor mounts it: controlled, with the real debounce + fetch. */
function Harness({ onValue }: { onValue?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <SkillCombobox
      control={{ id: 'skill', 'aria-describedby': undefined, 'aria-invalid': undefined }}
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

const box = () => screen.getByRole('combobox');

afterEach(cleanup);
beforeEach(() => {
  client.GET.mockReset().mockResolvedValue(reply());
});

describe('the skill typeahead', () => {
  it('suggests approved skills that match what is typed, and adds the one picked', async () => {
    client.GET.mockResolvedValue(reply('Node.js', 'Notion'));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), 'No');

    const option = await screen.findByRole('option', { name: 'Node.js' });
    expect(within(screen.getByRole('listbox')).getByText('Notion')).toBeInTheDocument();

    await user.click(option);

    expect(box()).toHaveValue('Node.js');
    // Picking one closes the list.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('can be driven by the keyboard: arrow to a suggestion and press Enter', async () => {
    client.GET.mockResolvedValue(reply('Node.js', 'Notion'));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), 'No');
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(box()).toHaveValue('Notion');
  });

  it('keeps whatever is typed, even when nothing matches', async () => {
    // The taxonomy has no match; the field is still free text.
    client.GET.mockResolvedValue(reply());
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(box(), 'Esperanto-fu');

    expect(box()).toHaveValue('Esperanto-fu');
    expect(onValue).toHaveBeenLastCalledWith('Esperanto-fu');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('does not offer back a skill that is already typed in full', async () => {
    client.GET.mockResolvedValue(reply('Node.js'));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(box(), 'Node.js');

    // The one match equals the value, so there is nothing left to suggest.
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
