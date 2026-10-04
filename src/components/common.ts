export type EnvConf = Record<string, string>;

/**
 * Lowercases and collapses every run of characters other than letters, digits, `_` and `-` into
 * a single hyphen, e.g. `Verify Generation (PR)` -> `verify-generation-pr`
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Util for getting undefined if an object or array is empty
 * to avoid having extra noise in the generated yaml
 */
export function undefinedIfEmpty<T extends Record<string, any> | any[] | undefined>(
  thing: T,
): T | undefined {
  if (typeof thing === 'undefined') return undefined;
  if (Array.isArray(thing) && thing.length > 0) return thing;
  if (Object.keys(thing).length > 0) return thing;
  return undefined;
}
