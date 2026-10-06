import { ghaTemplateString } from './bash-string.ts';

export type EnvConf = Record<string, string>;

export interface ConcurrencyExpression {
  expression: string;
}

export interface Concurrency {
  group: string;
  cancelInProgress: boolean | ConcurrencyExpression;
}

function isConcurrencyExpression(value: boolean | ConcurrencyExpression): value is ConcurrencyExpression {
  return typeof (value as ConcurrencyExpression).expression === 'string';
}

/**
 * Builds the plain object GitHub expects for a `concurrency:` block, or undefined if none
 * was configured, so callers can inline it directly into a YAML.Document without extra checks.
 */
export function concurrencyToYaml(concurrency: Concurrency | undefined) {
  if (!concurrency) return undefined;
  return {
    'group': concurrency.group,
    'cancel-in-progress': isConcurrencyExpression(concurrency.cancelInProgress)
      ? ghaTemplateString(concurrency.cancelInProgress.expression)
      : concurrency.cancelInProgress,
  };
}

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
