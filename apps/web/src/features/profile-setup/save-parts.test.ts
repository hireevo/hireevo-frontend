import { describe, expect, it } from 'vitest';
import { PROFILE_FIELDS, type ProfileField } from './api.ts';
import { PROFILE_GROUPS, PROFILE_PARTS } from './use-profile-draft.ts';

/**
 * Which save carries which field.
 *
 * The groups decide what a section's button sends, so a field in the wrong one
 * is saved by pressing something else — or by pressing nothing at all. That is
 * not visible on screen: the section looks saved, and the field is simply not
 * in the request.
 */
describe('the parts a profile saves in', () => {
  it('claims the photo by itself, rather than through the section below it', () => {
    // The photo is chosen in the header card, nowhere near a Save. It used to
    // travel with `about`, so a picture only reached the profile when somebody
    // pressed Save in a card further down the page — and one that never was
    // looked exactly like an upload that had failed.
    expect(PROFILE_GROUPS.avatar).toEqual(['avatarKey']);
    expect(PROFILE_GROUPS.about).not.toContain('avatarKey');
  });

  it('carries every field the form edits, in exactly one part', () => {
    const carried = PROFILE_PARTS.flatMap((part) => [...PROFILE_GROUPS[part]]);

    // Nothing edited is left without a save …
    for (const field of PROFILE_FIELDS) {
      expect(carried, `${field} belongs to no save`).toContain(field);
    }
    // … and nothing is sent by two of them, which is how a half-typed
    // neighbour rides along with the section somebody actually pressed.
    expect(new Set(carried).size).toBe(carried.length);
    // Only fields the form holds: a group naming something else would send a
    // key the API does not take.
    for (const field of carried) {
      expect(PROFILE_FIELDS as readonly ProfileField[]).toContain(field);
    }
  });
});
