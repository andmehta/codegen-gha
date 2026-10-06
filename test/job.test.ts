import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { NormalJob, RUNS_ON } from '../src/components/job.ts';
import { BashStep } from '../src/components/step.ts';

describe('NormalJob', () => {
  it('serializes a raw matrix strategy', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      strategy: { failFast: false, matrix: { module: ['gcp', 'cloudflare'] } },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('strategy:');
    expect(yaml).toContain('fail-fast: false');
    expect(yaml).toContain('module:');
    expect(yaml).toContain('- gcp');
    expect(yaml).toContain('- cloudflare');
  });

  it('serializes a matrix strategy driven by an expression', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      strategy: { failFast: true, matrix: { expression: 'fromJSON(inputs.matrix)' } },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('strategy:');
    expect(yaml).toContain('fail-fast: true');
    expect(yaml).toContain('matrix: ${{ fromJSON(inputs.matrix) }}');
  });

  it('omits strategy when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('strategy:');
  });

  it('serializes a job-level concurrency block', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      concurrency: { group: 'test-${{ github.ref }}', cancelInProgress: { expression: "github.event_name == 'pull_request'" } },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('concurrency:');
    expect(yaml).toContain('group: test-${{ github.ref }}');
    expect(yaml).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
  });

  it('omits concurrency when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('concurrency:');
  });
});
