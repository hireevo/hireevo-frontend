import tokens from './tokens.json' with { type: 'json' };

/**
 * A token value may reference another token by path, e.g. `{color.green.800}`.
 * References exist so a semantic name records *which* primitive it points at —
 * that link is what makes a palette change reviewable instead of a find-replace.
 */
const REFERENCE = /^\{([^}]+)\}$/;

function lookup(path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[key];
  }, tokens);

  if (typeof value !== 'string') {
    throw new Error(`Token reference "{${path}}" does not resolve to a value.`);
  }
  return value;
}

/** Resolves a token value, following references until a literal is reached. */
export function resolveToken(value: string, depth = 0): string {
  if (depth > 10) throw new Error(`Token reference cycle at "${value}".`);
  const match = REFERENCE.exec(value);
  return match?.[1] === undefined ? value : resolveToken(lookup(match[1]), depth + 1);
}

/** Flattens a nested token group into `prefix-path` → resolved value pairs. */
export function flatten(node: unknown, prefix: string[] = []): Record<string, string> {
  if (typeof node === 'string') {
    return prefix.length > 0 ? { [prefix.join('-')]: resolveToken(node) } : {};
  }
  if (node === null || typeof node !== 'object') return {};

  return Object.entries(node as Record<string, unknown>)
    .filter(([key]) => !key.startsWith('$'))
    .reduce<Record<string, string>>(
      (acc, [key, child]) => Object.assign(acc, flatten(child, [...prefix, key])),
      {},
    );
}

export { tokens };
