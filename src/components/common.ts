export type EnvConf = Record<string, string>;

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
