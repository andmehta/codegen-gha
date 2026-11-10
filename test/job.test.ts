import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { IfCondition } from '../src/components/if-condition.ts';
import { jobOutput, jobOutputValue, NormalJob, RUNS_ON, WorkflowCallJob } from '../src/components/job.ts';
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

  it('serializes a matrix with a per-key expression alongside raw values', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      strategy: {
        failFast: true,
        matrix: {
          package: { expression: 'fromJson(needs.detect-changes.outputs.packages)' },
          os: ['ubuntu-latest'],
        },
      },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('strategy:');
    expect(yaml).toContain('package: ${{ fromJson(needs.detect-changes.outputs.packages) }}');
    expect(yaml).toContain('os:');
    expect(yaml).toContain('- ubuntu-latest');
  });

  it('omits fail-fast when not provided, leaving GitHub default behavior', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      strategy: { matrix: { module: ['gcp', 'cloudflare'] } },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('strategy:');
    expect(yaml).not.toContain('fail-fast');
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

  it('serializes continueOnError', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      continueOnError: true,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).toContain('continue-on-error: true');
  });

  it('omits continue-on-error when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('continue-on-error');
  });

  it('serializes defaults.run.working-directory and shell', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      defaults: { run: { workingDirectory: 'infrastructure/terraform', shell: 'bash' } },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('defaults:');
    expect(yaml).toContain('working-directory: infrastructure/terraform');
    expect(yaml).toContain('shell: bash');
  });

  it('omits defaults when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('defaults:');
  });

  it('serializes outputs', () => {
    const job = new NormalJob({
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      outputs: { web: '${{ steps.affected.outputs.web }}' },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('outputs:');
    expect(yaml).toContain('web:');
  });

  it('omits outputs when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('outputs:');
  });

  it('serializes job-level permissions', () => {
    const job = new NormalJob({
      name: 'comment-on-pr',
      runsOn: RUNS_ON.GITHUB_LATEST,
      permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'write', 'checks': 'read', 'actions': 'read' },
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('permissions:');
    expect(yaml).toContain('pull-requests: write');
  });

  it('omits permissions when not provided', () => {
    const job = new NormalJob({
      name: 'test',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(job.toYaml().toString()).not.toContain('permissions:');
  });
});

describe('NormalJob environment', () => {
  const steps = [new BashStep({ name: 'Deploy', run: bash`./deploy.sh` })];

  it('serializes a string environment directly after runs-on', () => {
    const job = new NormalJob({ name: 'deploy', needs: ['build'], runsOn: RUNS_ON.GITHUB_LATEST, environment: 'staging', steps });

    expect(job.toYaml().toJSON()).toMatchObject({ environment: 'staging' });
    expect(Object.keys(job.toYaml().toJSON())).toEqual(['name', 'needs', 'runs-on', 'environment', 'steps']);
  });

  it('serializes an environment with a url', () => {
    const job = new NormalJob({
      name: 'deploy',
      runsOn: RUNS_ON.GITHUB_LATEST,
      environment: { name: 'staging', url: '${{ steps.deploy.outputs.url }}' },
      steps,
    });

    expect(job.toYaml().toJSON()).toMatchObject({
      environment: { name: 'staging', url: '${{ steps.deploy.outputs.url }}' },
    });
  });

  it('omits environment when not set', () => {
    const job = new NormalJob({ name: 'deploy', runsOn: RUNS_ON.GITHUB_LATEST, steps });

    expect(job.toYaml().toJSON()).not.toHaveProperty('environment');
  });
});

describe('jobOutput', () => {
  it('references another job\'s output by id', () => {
    const job = new NormalJob({
      id: 'detect',
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(jobOutput(job, 'web')).toBe('needs.detect.outputs.web');
  });

  it('throws when referencing the output of a job with no id', () => {
    const job = new NormalJob({
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(() => jobOutput(job, 'web')).toThrow("Cannot reference output 'web' of a job with no id");
  });

  it('references a WorkflowCallJob\'s output by id', () => {
    const job = new WorkflowCallJob({ id: 'detect', workflowSpecifier: './.github/workflows/detect.gen.yaml' });

    expect(jobOutput(job, 'web')).toBe('needs.detect.outputs.web');
  });
});

describe('jobOutputValue', () => {
  it('builds a standalone jobs.<id>.outputs.<key> expression', () => {
    const job = new NormalJob({
      id: 'detect',
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(jobOutputValue(job, 'web')).toBe('${{ jobs.detect.outputs.web }}');
  });

  it('throws when referencing the output of a job with no id', () => {
    const job = new NormalJob({
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    expect(() => jobOutputValue(job, 'web')).toThrow("Cannot reference output 'web' of a job with no id");
  });
});

describe('WorkflowCallJob', () => {
  it('serializes a minimal call with only a workflow specifier', () => {
    const job = new WorkflowCallJob({ workflowSpecifier: './.github/workflows/detect.gen.yaml' });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('uses: ./.github/workflows/detect.gen.yaml');
    expect(yaml).not.toContain('name:');
    expect(yaml).not.toContain('if:');
    expect(yaml).not.toContain('needs:');
    expect(yaml).not.toContain('with:');
    expect(yaml).not.toContain('secrets:');
  });

  it('omits secrets by default', () => {
    const job = new WorkflowCallJob({ workflowSpecifier: './.github/workflows/detect.gen.yaml' });

    expect(job.toYaml().toString()).not.toContain('secrets:');
  });

  it('serializes secrets: inherit when requested', () => {
    const job = new WorkflowCallJob({ workflowSpecifier: './.github/workflows/detect.gen.yaml', secrets: 'inherit' });

    expect(job.toYaml().toString()).toContain('secrets: inherit');
  });

  it('serializes an explicit secrets map', () => {
    const job = new WorkflowCallJob({
      workflowSpecifier: './.github/workflows/detect.gen.yaml',
      secrets: { TOKEN: '${{ secrets.TOKEN }}' },
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('secrets:');
    expect(yaml).toContain('TOKEN: ${{ secrets.TOKEN }}');
  });

  it('serializes name, needs, condition and params when provided', () => {
    const job = new WorkflowCallJob({
      name: 'Detect changes',
      needs: ['setup'],
      condition: IfCondition.isPullRequest(),
      workflowSpecifier: './.github/workflows/detect.gen.yaml',
      params: { ref: '${{ github.sha }}' },
    });

    const yaml = job.toYaml().toString();
    expect(yaml).toContain('name: Detect changes');
    expect(yaml).toContain('needs:');
    expect(yaml).toContain('- setup');
    expect(yaml).toContain("if: ${{ github.event_name == 'pull_request' }}");
    expect(yaml).toContain('with:');
    expect(yaml).toContain('ref:');
  });
});
