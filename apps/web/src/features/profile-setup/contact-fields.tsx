'use client';

import { cn } from '@hireevo/ui-web';
import type { ContactField, ContactValues, FieldErrors } from './api.ts';
import { border } from './entry-fields.ts';
import { CONTROL, SetupField } from './setup-field.tsx';

/** The longest any of these may be, matching the columns behind them. */
const LIMITS: Record<ContactField, number> = {
  phoneE164: 16,
  contactEmail: 254,
  whatsappE164: 16,
  linkedinUrl: 300,
  figmaUrl: 300,
};

/**
 * How a client is meant to reach this person.
 *
 * None of it is published. These go to the profile's private companion row,
 * the same one the address and date of birth live in, and the serializer that
 * builds a public page is never given that row — so nothing typed here can
 * appear beside the profile, at any visibility setting. The card's own note
 * says so, because a form asking for a phone number and a WhatsApp number
 * should say where they end up before it asks.
 *
 * Fields only, with no heading or save of their own: the card around them
 * brings both, exactly as the About section's fields do.
 */
export function ContactFields({
  values,
  fieldErrors,
  onChange,
}: {
  values: ContactValues;
  fieldErrors: FieldErrors;
  onChange: (field: ContactField, value: string) => void;
}) {
  const field = (name: ContactField) => ({
    error: fieldErrors[name],
    className: cn(CONTROL, 'h-10', border(fieldErrors[name])),
    value: values[name],
    maxLength: LIMITS[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value),
  });

  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <SetupField
        label="Contact No"
        note="(with country code)"
        optional={false}
        required
        error={fieldErrors.phoneE164}
      >
        {(control) => (
          <input
            {...control}
            name="phoneE164"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 9876543210"
            {...field('phoneE164')}
          />
        )}
      </SetupField>

      <SetupField label="Email" optional={false} required error={fieldErrors.contactEmail}>
        {(control) => (
          <input
            {...control}
            name="contactEmail"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            {...field('contactEmail')}
          />
        )}
      </SetupField>

      <SetupField label="WhatsApp" optional={false} required error={fieldErrors.whatsappE164}>
        {(control) => (
          <input
            {...control}
            name="whatsappE164"
            type="tel"
            inputMode="tel"
            placeholder="+91 9876543210"
            {...field('whatsappE164')}
          />
        )}
      </SetupField>

      <SetupField
        label="LinkedIn"
        note="(Optional)"
        optional={false}
        error={fieldErrors.linkedinUrl}
      >
        {(control) => (
          <input
            {...control}
            name="linkedinUrl"
            inputMode="url"
            placeholder="linkedin.com/in/username"
            {...field('linkedinUrl')}
          />
        )}
      </SetupField>

      <SetupField label="Figma" note="(Optional)" optional={false} error={fieldErrors.figmaUrl}>
        {(control) => (
          <input
            {...control}
            name="figmaUrl"
            inputMode="url"
            placeholder="figma.com/@username"
            {...field('figmaUrl')}
          />
        )}
      </SetupField>
    </div>
  );
}
