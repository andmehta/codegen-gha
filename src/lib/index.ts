import { ActionStep } from '../components/step.ts';

/**
 * Building blocks shared across workflows. When a step, job or condition shows up in more than
 * one workflow, define it once here and import it, so a change like bumping an action version
 * happens in one place. Nothing here is generated on its own; only exported Workflows are.
 */

export const checkout = new ActionStep({
  name: 'Checkout',
  actionSpecifier: 'actions/checkout@v7',
  params: {},
});

export const setupNode = new ActionStep({
  name: 'Setup Node.js',
  actionSpecifier: 'actions/setup-node@v6',
  params: { 'node-version': 'lts/*' },
});

export const setupPnpm = new ActionStep({
  name: 'Setup pnpm',
  actionSpecifier: 'pnpm/setup@v1',
  params: { cache: true, install: false },
});
