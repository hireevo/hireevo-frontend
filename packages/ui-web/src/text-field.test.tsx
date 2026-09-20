import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextField } from './text-field.tsx';

describe('TextField', () => {
  it('links the label to the input it labels', () => {
    render(<TextField label="E-mail" placeholder="example@gmail.com" />);
    // `getByLabelText` only finds the input if the association actually holds,
    // which is the point of generating the id inside the component.
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('placeholder', 'example@gmail.com');
  });

  it('announces an error and marks the input invalid', () => {
    render(<TextField label="E-mail" error="Enter a valid email address." />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address.');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /**
   * The design draws a field with a problem exactly like a field without one,
   * and puts the whole signal in the message underneath. A red box around the
   * field said the same thing a second time, in a colour the message never
   * used — the message is in the warning ramp, the border was in the danger
   * one. Nothing is lost for anyone who cannot see colour: the message carries
   * `role="alert"` and describes the input.
   */
  it('leaves the field looking as it did, and says what is wrong underneath', () => {
    const { rerender } = render(<TextField label="User Name" />);
    const shell = () => screen.getByLabelText('User Name').closest('span');
    const quiet = shell()?.className;

    rerender(<TextField label="User Name" error="User name is already taken" />);

    expect(shell()?.className).toBe(quiet);
    expect(screen.getByRole('alert')).toHaveTextContent('User name is already taken');
  });

  it('describes the input with a hint without raising an alert', () => {
    render(<TextField label="User Name" hint="Letters, numbers and underscores." />);
    expect(screen.getByLabelText('User Name')).toHaveAccessibleDescription(
      'Letters, numbers and underscores.',
    );
    // A hint is not news. Announcing it the moment it renders interrupts for nothing.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a hidden label available to assistive technology', () => {
    render(<TextField label="Search" hideLabel />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });
});
