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

  it('omits concurrency when not provided', () => {
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

    expect(workflow.serialize()).not.toContain('concurrency:');
  });

  it('serializes a literal concurrency block', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: { pull_request: null },
      permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
      concurrency: { group: 'ci-${{ github.workflow }}-${{ github.ref }}', cancelInProgress: true },
      jobs: {
        test: new NormalJob({
          name: 'test',
          runsOn: RUNS_ON.GITHUB_LATEST,
          steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
        }),
      },
    });

    const yaml = workflow.serialize();
    expect(yaml).toContain('concurrency:');
    expect(yaml).toContain('group: ci-${{ github.workflow }}-${{ github.ref }}');
    expect(yaml).toContain('cancel-in-progress: true');
  });

  it('serializes a concurrency block driven by an expression', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: { pull_request: null },
      permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
      concurrency: {
        group: 'ci-${{ github.workflow }}',
        cancelInProgress: { expression: "github.event_name == 'pull_request'" },
      },
      jobs: {
        test: new NormalJob({
          name: 'test',
          runsOn: RUNS_ON.GITHUB_LATEST,
          steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
        }),
      },
    });

    const yaml = workflow.serialize();
    expect(yaml).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
  });

  it('serializes paths-ignore, branches-ignore, tags and tags-ignore trigger narrowers', () => {
    const workflow = new Workflow({
      name: 'CI',
      trigger: {
        pull_request: {
          'paths-ignore': ['infrastructure/**', '**/*.md'],
          'branches-ignore': ['releases/**'],
        },
        push: {
          tags: ['v*'],
          'tags-ignore': ['v*-beta'],
        },
      },
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
    expect(yaml).toContain('paths-ignore:');
    expect(yaml).toContain('infrastructure/**');
    expect(yaml).toContain('branches-ignore:');
    expect(yaml).toContain('releases/**');
    expect(yaml).toContain('tags:');
    expect(yaml).toContain('v*');
    expect(yaml).toContain('tags-ignore:');
    expect(yaml).toContain('v*-beta');
  });
});
