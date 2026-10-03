import { ActionStep } from '../components/step.ts';

/**
 * Example reusable building blocks for workflows. Add more presets here as
 * this repo's own workflows need them.
 */

export const checkout = new ActionStep({
  name: 'Checkout',
  actionSpecifier: 'actions/checkout@v6',
  params: {},
});

export const setupPnpm = new ActionStep({
  name: 'Setup pnpm',
  actionSpecifier: 'pnpm/action-setup@v5',
  params: { version: '10.33.0' },
});
