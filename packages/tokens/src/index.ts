import { flatten, resolveToken, tokens } from './resolve.ts';

export { tokens, resolveToken };

export type ColorScheme = 'light' | 'dark';

/**
 * The semantic palette for one colour scheme, with every reference resolved to a
 * literal. React Native has no CSS custom properties, so `packages/ui-native`
 * consumes this object where the web consumes `tokens.css`. Both come from the
 * same JSON, which is the point.
 */
export function semanticPalette(scheme: ColorScheme): Record<string, string> {
  return flatten(tokens.semantic[scheme]);
}

/** Non-colour scales, shared verbatim between web and native. */
export const theme = {
  font: tokens.font,
  space: tokens.space,
  radius: tokens.radius,
  elevation: tokens.elevation,
  motion: tokens.motion,
  breakpoint: tokens.breakpoint,
} as const;

export type SemanticColorName = keyof typeof tokens.semantic.light;
export type SpaceName = keyof typeof tokens.space;
export type RadiusName = keyof typeof tokens.radius;
export type FontSizeName = keyof typeof tokens.font.size;
