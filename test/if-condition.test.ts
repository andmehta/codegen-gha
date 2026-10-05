import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { IfCondition } from '../src/components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../src/components/job.ts';
import { BashStep } from '../src/components/step.ts';

const step = new BashStep({ name: 'Verify', id: 'verify', run: bash`true` });

const a = new IfCondition({ expression: 'a' });
const b = new IfCondition({ expression: 'b' });
const c = new IfCondition({ expression: 'c' });

function render(condition: IfCondition): string {
  return condition.toYaml().toString().trim();
}

describe('IfCondition', () => {
  it('wraps its expression in ${{ }}', () => {
    expect(render(new IfCondition({ expression: 'always()' }))).toBe('${{ always() }}');
  });

  describe('factories', () => {
    it('stepOutputNotNull checks the step output is non-empty', () => {
      expect(render(IfCondition.stepOutputNotNull(step, 'diff'))).toBe("${{ steps.verify.outputs.diff != '' }}");
    });

    it('stepOutputNull checks the step output is empty', () => {
      expect(render(IfCondition.stepOutputNull(step, 'diff'))).toBe("${{ steps.verify.outputs.diff == '' }}");
    });

    it('jobOutputEquals compares a job output to a value', () => {
      const detect = new NormalJob({
        id: 'detect',
        name: 'detect',
        runsOn: RUNS_ON.GITHUB_LATEST,
        steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
      });
      expect(render(IfCondition.jobOutputEquals(detect, 'web', 'true'))).toBe("${{ needs.detect.outputs.web == 'true' }}");
    });

    it('isPullRequest checks the triggering event', () => {
      expect(render(IfCondition.isPullRequest())).toBe("${{ github.event_name == 'pull_request' }}");
    });

    it.each([
      ['stepOutputNotNull', IfCondition.stepOutputNotNull],
      ['stepOutputNull', IfCondition.stepOutputNull],
    ])('%s throws for a step with no id', (_, factory) => {
      const noId = new BashStep({ name: 'x', run: bash`true` });
      expect(() => factory(noId, 'diff')).toThrow("Cannot reference output 'diff' of a step with no id");
    });
  });

  describe('combinators', () => {
    it('and joins with &&', () => {
      expect(render(a.and(b))).toBe('${{ a && b }}');
    });

    it('or joins with ||', () => {
      expect(render(a.or(b))).toBe('${{ (a || b) }}');
    });

    it('does not mutate either side', () => {
      a.and(b);
      a.or(b);
      expect(render(a)).toBe('${{ a }}');
      expect(render(b)).toBe('${{ b }}');
    });

    it('keeps an or grouped when it is and-ed afterwards', () => {
      expect(render(a.or(b).and(c))).toBe('${{ (a || b) && c }}');
    });

    it('keeps an or grouped when it is the right side of an and', () => {
      expect(render(a.and(b.or(c)))).toBe('${{ a && (b || c) }}');
    });

    it('needs no grouping to or an and, since && binds tighter', () => {
      expect(render(a.and(b).or(c))).toBe('${{ (a && b || c) }}');
    });
  });

  it('renders as the if: of a step', () => {
    const conditional = new BashStep({
      name: 'Comment',
      condition: IfCondition.isPullRequest().and(IfCondition.stepOutputNotNull(step, 'diff')),
      run: bash`true`,
    });
    expect(conditional.toYaml().toString()).toContain(
      "if: ${{ github.event_name == 'pull_request' && steps.verify.outputs.diff != '' }}",
    );
  });
});
