import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { NormalJob, RUNS_ON } from '../src/components/job.ts';
import { BashStep } from '../src/components/step.ts';
import { Workflow } from '../src/components/workflow.ts';

describe('Workflow', () => {
  it('serializes to yaml', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: { pull_request: null },
      permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
      env: {},
      jobs: {
        test: new NormalJob({
          name: 'test',
          needs: [],
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
