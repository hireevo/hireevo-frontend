import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminShell } from './admin-shell.tsx';
import { SAMPLE_WORKERS } from './sample-workers.ts';
import { WorkersScreen } from './workers-screen.tsx';

afterEach(cleanup);

const open = () => {
  const user = userEvent.setup();
  render(<WorkersScreen workers={SAMPLE_WORKERS} />);
  return user;
};

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

describe('the workers list', () => {
  it('shows one page of workers and says how many there are', () => {
    open();

    expect(rows()).toHaveLength(10);
    expect(screen.getByText('Showing 1–10 of 16')).toBeInTheDocument();
  });

  it('narrows as the name is typed, without waiting for Search', async () => {
    const user = open();

    await user.type(screen.getByRole('searchbox'), 'nwosu');

    expect(rows()).toHaveLength(1);
    // Scoped to the table: the same rows are also rendered as cards for narrow
    // windows, and jsdom applies no media query, so both are in the document.
    expect(within(screen.getByRole('table')).getByText('Amara Nwosu')).toBeInTheDocument();
  });

  /**
   * The state control is the one that can contradict itself.
   *
   * It stays shut until a country is chosen, and a country change clears it —
   * otherwise the panel reads "United States / Ontario" and answers with
   * nothing, which looks like an empty database rather than a contradiction.
   */
  it('opens the state control only once a country is chosen, and clears it when the country moves', async () => {
    const user = open();

    const country = screen.getByRole('combobox', { name: 'Country' });
    const state = screen.getByRole('combobox', { name: 'State' });
    expect(state).toBeDisabled();

    await user.selectOptions(country, 'Canada');
    expect(state).toBeEnabled();
    await user.selectOptions(state, 'Ontario');
    expect(rows()).toHaveLength(1);

    await user.selectOptions(country, 'United States');
    expect(state).toHaveValue('');
    // Every United States row, not the none that "United States / Ontario" has.
    expect(rows().length).toBeGreaterThan(1);
  });

  it('says so when nothing matches, and offers the way back', async () => {
    const user = open();

    await user.type(screen.getByRole('searchbox'), 'nobody at all');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // Twice on purpose: the panel's live region announces it, and the empty
    // table says it where the rows were.
    expect(screen.getAllByText('No workers match this search')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(rows()).toHaveLength(10);
  });

  it('moves between pages and back', async () => {
    const user = open();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Showing 11–16 of 16')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(screen.getByText('Showing 1–10 of 16')).toBeInTheDocument();
  });

  it('opens one worker in full, and closes back onto the button that opened it', async () => {
    const user = open();

    const details = within(rows()[0] as HTMLElement).getByRole('button', { name: 'Details' });
    await user.click(details);

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Marcus Delgado' })).toBeInTheDocument();
    expect(dialog.getByText('marcus.delgado@example.com')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(details).toHaveFocus();
  });
});

describe('the admin sections', () => {
  /**
   * Everything but Workers is drawn quietly and is not a link.
   *
   * The point of listing them is to say what the admin area will hold. A row
   * that can be pressed leads into a page that does not exist, and a row faded
   * with opacity drops under the contrast floor — both of which this screen has
   * to avoid at once (§6.7, §6.8).
   */
  it('lists every section, and only Workers can be opened', () => {
    render(
      <AdminShell
        title="Worker accounts"
        description="Search every worker."
        current="/admin/workers"
        admin={{ name: 'Husnain Raza', role: 'Administrator' }}
      >
        <p>Screen</p>
      </AdminShell>,
    );

    const sidebar = within(screen.getByRole('complementary', { name: 'Admin sections' }));
    const links = sidebar.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Workers']);
    expect(links[0]).toHaveAttribute('aria-current', 'page');

    // The rest are there, and each says it is not ready yet.
    for (const label of ['Dashboard', 'Employers', 'Countries', 'Page links', 'Services']) {
      expect(sidebar.getByText(label)).toBeInTheDocument();
    }
    expect(sidebar.getAllByText('Soon')).toHaveLength(16);
  });

  /**
   * The narrow window's menu, which is the sidebar folded up.
   *
   * Escape is listened for on the document rather than on the panel: pressing
   * the toggle leaves the focus on the toggle, which is outside the panel, so a
   * handler bound to the panel never hears the key that is supposed to dismiss
   * it — and a menu that covers the page and cannot be dismissed from the
   * keyboard is a trap (§6.8).
   */
  it('folds into a menu that opens, closes on Escape and hands the focus back', async () => {
    const user = userEvent.setup();
    render(
      <AdminShell
        title="Worker accounts"
        description="Search every worker."
        current="/admin/workers"
        admin={{ name: 'Husnain Raza', role: 'Administrator' }}
      >
        <p>Screen</p>
      </AdminShell>,
    );

    const toggle = screen.getByRole('button', { name: 'Open sections' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close sections' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open sections' })).toHaveFocus();
  });
});
