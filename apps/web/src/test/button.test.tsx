import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@hireevo/ui-web';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Publish profile</Button>);
    expect(screen.getByRole('button', { name: 'Publish profile' })).toBeInTheDocument();
  });

  it('blocks interaction while loading and says so out loud', () => {
    render(<Button loading>Publish profile</Button>);
    // A double submit on a loading button is how a duplicate profile gets
    // created, so `loading` must disable, not just look busy.
    const control = screen.getByRole('button', { name: /Loading/ });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
  });

  it('lets a caller override a default utility rather than stacking both', () => {
    render(<Button className="rounded-full">Publish</Button>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
    expect(screen.getByRole('button')).not.toHaveClass('rounded-md');
  });
});
