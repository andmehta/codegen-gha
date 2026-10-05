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

  it('omits needs, env, services and timeout-minutes when not provided', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: { pull_request: null },
      permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
      jobs: {
        test: new NormalJob({
          name: 'test',
          runsOn: RUNS_ON.GITHUB_LATEST,
          steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
        }),
      },
    });

    const yaml = workflow.serialize();
    expect(yaml).not.toContain('env:');
    expect(yaml).not.toContain('needs:');
    expect(yaml).not.toContain('services:');
    expect(yaml).not.toContain('timeout-minutes:');
  });
});
