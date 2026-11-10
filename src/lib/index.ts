import { ActionStep } from '../components/step.ts';

/**
 * Building blocks shared across workflows. When a step, job or condition shows up in more than
 * one workflow, define it once here and import it, so a change like bumping an action version
 * happens in one place. Nothing here is generated on its own; only exported Workflows are.
 */

export const checkout = new ActionStep({
  name: 'Checkout',
  actionSpecifier: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  versionComment: 'v7.0.1',
  params: {},
});

export const setupNode = new ActionStep({
  name: 'Setup Node.js',
  actionSpecifier: 'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38',
  versionComment: 'v6.5.0',
  params: { 'node-version': 'lts/*' },
});

export const setupPnpm = new ActionStep({
  name: 'Setup pnpm',
  actionSpecifier: 'pnpm/setup@5d160c5bc68a09337ad0d5654e237e03253b5879',
  versionComment: 'v1.0.0',
  params: { cache: true, install: false },
});
