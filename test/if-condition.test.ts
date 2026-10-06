import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { IfCondition } from '../src/components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../src/components/job.ts';
import { BashStep } from '../src/components/step.ts';

describe('IfCondition.jobOutputEquals', () => {
  it('builds an expression comparing a job output to a value', () => {
    const detect = new NormalJob({
      id: 'detect',
      name: 'detect',
      runsOn: RUNS_ON.GITHUB_LATEST,
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    });

    const condition = IfCondition.jobOutputEquals(detect, 'web', 'true');
    expect(condition.toYaml().toString()).toBe("${{ needs.detect.outputs.web == 'true' }}\n");
  });
});
