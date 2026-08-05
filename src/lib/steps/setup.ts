import { ActionStep } from '../../components/step';
import { ghaTemplateString } from '../../components/bashString';

export const checkoutDepth2 = new ActionStep({
  name: 'Checkout',
  actionSpecifier: 'actions/checkout@v4',
  params: {
    'fetch-depth': 2,
  },
});

export const workspaceCleanupStep = new ActionStep({
  name: 'Register post action for workspace cleanup',
  actionSpecifier: 'velocibear/clean-after-action@9e9132154594236c9e4b1c904ead3c5c4000a18c',
  params: {},
});

export const setupStep = new ActionStep({
  name: 'Set up node and expand pnpm cache if possible',
  actionSpecifier: './.github/actions/setup-node-expand-pnpm-cache',
  params: {},
});
export const installStep = new ActionStep({
  name: 'Install deps',
  actionSpecifier: './.github/actions/install-deps',
  params: {
    since: ghaTemplateString('inputs.since-commit-sha'),
    'use-distributed-caching': 'false',
  },
});
