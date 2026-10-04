import { bash } from '../components/bash-string.ts';
import { IfCondition } from '../components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { BashStep } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';

export const example = new Workflow({
  name: 'Example',
  trigger: { pull_request: null },
  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
  env: {},
  jobs: {
    test: new NormalJob({
      name: 'test',
      needs: [],
      condition: new IfCondition({ expression: 'true' }),
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      env: {},
      services: {},
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    }),
  },
});
