import { bash } from '../components/bash-string.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { BashStep } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { checkout, setupPnpm } from '../lib/index.ts';

export const example = new Workflow({
  name: 'Example',
  trigger: { pull_request: null },
  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
  jobs: {
    test: new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      steps: [checkout, setupPnpm, new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    }),
  },
});
