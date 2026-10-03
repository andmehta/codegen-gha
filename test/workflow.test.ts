import { describe, expect, it } from 'vitest';
import { BashStep, IfCondition, NormalJob, RUNS_ON, Workflow, bash } from '../src/index.ts';

describe('Workflow', () => {
  it('serializes to yaml', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: { pull_request: null },
      permissions: { 'id-token': 'read', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
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

    expect(workflow.serialize()).toContain('name: test');
  });
});
