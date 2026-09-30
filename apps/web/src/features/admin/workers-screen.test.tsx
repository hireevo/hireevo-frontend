import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminShell } from './admin-shell.tsx';
import { WorkersPreview } from './workers-preview.tsx';

afterEach(cleanup);

/**
 * The screen over the fixture, which is what `/design-system/admin` renders.
 *
 * The screen itself only draws and asks; what a search matches and what a ban
 * does live in a container. This is the container with the sample data in it,
 * so these tests are about the two of them together — which is the pair the
 * sweep measures and the pair a reviewer looks at.
 */
const open = () => {
  const user = userEvent.setup();
  render(<WorkersPreview />);
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

    await user.type(screen.getByRole('textbox', { name: 'Worker name' }), 'nwosu');

    // Waited for, because the search does not fire on every keystroke: a
    // request per letter is five requests for a five-letter name, and only the
    // last one is an answer anybody is waiting for.
    await waitFor(() => expect(rows()).toHaveLength(1));
    // The email rather than the name: the name is also in the accessible names
    // of that row's buttons ("Details for Amara Nwosu"), and an assertion that
    // matches three things is one that fails for a reason nobody intended.
    expect(
      within(screen.getByRole('table')).getByText('amara.nwosu@example.com'),
    ).toBeInTheDocument();
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

    await user.type(screen.getByRole('textbox', { name: 'Worker name' }), 'nobody at all');
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    // Twice on purpose: the panel's live region announces it, and the empty
    // table says it where the rows were.
    expect(screen.getAllByText('No workers match this search')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0] as HTMLElement);
    await waitFor(() => expect(rows()).toHaveLength(10));
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

    const actions = within(rows()[0] as HTMLElement).getByRole('button', {
      name: /^Actions for/,
    });
    await user.click(actions);
    await user.click(screen.getByRole('menuitem', { name: 'View details' }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Marcus Delgado' })).toBeInTheDocument();
    expect(dialog.getByText('marcus.delgado@example.com')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  /**
   * Banning is the one thing on this screen that changes somebody's account.
   *
   * It asks first, names the person in the question, and says what happens to
   * them: the row an administrator meant to press and the row they did press
   * are one line apart, and "Are you sure?" answers neither question. Letting
   * them back in does not ask, because that is the undo.
   */
  it('asks before banning, and says who it is about', async () => {
    const user = open();

    await user.click(
      within(rows()[0] as HTMLElement).getByRole('button', { name: /^Actions for/ }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Unban user' }));
    // Marcus starts banned, so the first press is the undo and takes no asking.
    expect(within(rows()[0] as HTMLElement).getByText('Unflagged')).toBeInTheDocument();

    await user.click(
      within(rows()[0] as HTMLElement).getByRole('button', { name: /^Actions for/ }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Ban user' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Ban Marcus Delgado?' })).toBeInTheDocument();
    expect(dialog.getByText(/will not be able to sign in/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Ban Marcus' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(rows()[0] as HTMLElement).getByText('Flagged')).toBeInTheDocument();
  });

  it('changes nothing when the question is answered with Cancel', async () => {
    const user = open();

    const second = rows()[1] as HTMLElement;
    expect(within(second).getByText('Unflagged')).toBeInTheDocument();

    await user.click(within(second).getByRole('button', { name: /^Actions for/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Ban user' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(rows()[1] as HTMLElement).getByText('Unflagged')).toBeInTheDocument();
  });

  it('says out loud what happened, for anyone not watching the chip', async () => {
    const user = open();

    await user.click(
      within(rows()[0] as HTMLElement).getByRole('button', { name: /^Actions for/ }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Unban user' }));

    expect(screen.getByText('Marcus Delgado can sign in again.')).toBeInTheDocument();
  });

  /**
   * The preview says what it is.
   *
   * Everything on it works — the search, the paging, the ban — over sample
   * data, and a row that changes on screen and nowhere else would otherwise
   * read as a change that reached an account.
   */
  it('says that the preview reaches no account', () => {
    open();

    expect(screen.getByText(/nothing here reaches an account/)).toBeInTheDocument();
  });
});
