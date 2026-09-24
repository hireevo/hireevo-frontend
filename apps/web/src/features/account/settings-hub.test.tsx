import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SettingsHub } from './settings-hub.tsx';

afterEach(cleanup);

describe('the account settings hub', () => {
  it('lists the four parts of the account the design draws', () => {
    render(<SettingsHub />);

    for (const title of [
      'Personal information',
      'Account security',
      'Notifications',
      'Identity verification',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  /**
   * Two of the four have somewhere to go.
   *
   * Notifications and identity verification have no API behind them — no
   * endpoint, no table — so they are drawn but not linked. A card that opens a
   * page with nothing on it is worse than one that says it is not ready, and a
   * link to a route nobody wrote is what §6.7 is about.
   */
  it('links only the parts that exist, and marks the rest as not ready', () => {
    render(<SettingsHub />);

    expect(screen.getByRole('link', { name: /Personal information/ })).toHaveAttribute(
      'href',
      '/account/personal',
    );
    expect(screen.getByRole('link', { name: /Account security/ })).toHaveAttribute(
      'href',
      '/account/security',
    );

    expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Identity verification/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Soon')).toHaveLength(2);
  });
});
