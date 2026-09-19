import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button.tsx';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Publish profile</Button>);
    expect(screen.getByRole('button', { name: 'Publish profile' })).toBeInTheDocument();
  });

  it('blocks a click while loading, and says so out loud, without losing focus', async () => {
    // A double submit on a loading button is how a duplicate profile gets
    // created, so the click must not fire. It is blocked with aria-disabled and
    // a guard rather than the disabled attribute, because a disabled element
    // throws the keyboard user's focus to <body> the moment they submit.
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publish profile
      </Button>,
    );

    const control = screen.getByRole('button', { name: /Loading/ });
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveAttribute('aria-busy', 'true');
    expect(control).not.toBeDisabled(); // still focusable

    control.focus();
    await userEvent.click(control);
    expect(onClick).not.toHaveBeenCalled();
    expect(control).toHaveFocus();
  });

  it('keeps using the disabled attribute for a genuinely disabled button', () => {
    render(<Button disabled>Publish profile</Button>);
    expect(screen.getByRole('button', { name: 'Publish profile' })).toBeDisabled();
  });

  it('lets a caller override a default utility rather than stacking both', () => {
    render(<Button className="rounded-full">Publish</Button>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
    expect(screen.getByRole('button')).not.toHaveClass('rounded-md');
  });
});
