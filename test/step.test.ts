import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { ActionStep, BashStep, stepOutput, toStepId } from '../src/components/step.ts';

describe('toStepId', () => {
  it('leaves an unset id unset', () => {
    expect(toStepId(undefined)).toBeUndefined();
  });

  it.each([
    ['verify', 'verify'],
    ['_private', '_private'],
    ['step_2-b', 'step_2-b'],
  ])('keeps already valid id %j as-is', (id, expected) => {
    expect(toStepId(id)).toBe(expected);
  });

  it.each([
    ['Verify', 'verify'],
    ['Run Tests', 'run-tests'],
    ['run   tests', 'run-tests'],
    ['Run Tests (unit)', 'run-tests-unit'],
    ['deploy v1.2', 'deploy-v1-2'],
    ['  verify  ', 'verify'],
    ['-verify-', 'verify'],
    ['_verify_', '_verify_'],
    ['naïve step', 'na-ve-step'],
  ])('slugifies %j to %j', (id, expected) => {
    expect(toStepId(id)).toBe(expected);
  });

  it.each([
    ['1st-step', '1st-step'],
    ['-1', '1'],
    ['', ''],
    ['   ', ''],
    ['!!!', ''],
  ])('throws on %j, which slugifies to the invalid %j', (id, slug) => {
    expect(() => toStepId(id)).toThrow(`Step id '${id}' slugifies to '${slug}', which isn't a valid id`);
  });
});

describe('step constructors', () => {
  it.each([
    ['BashStep', (id: string) => new BashStep({ name: 'x', id, run: bash`true` })],
    ['ActionStep', (id: string) => new ActionStep({ name: 'x', id, actionSpecifier: 'actions/checkout@v6', params: {} })],
  ])('%s slugifies its id', (_, make) => {
    const step = make('My Step');
    expect(step.id).toBe('my-step');
    expect(step.toYaml().toString()).toContain('id: my-step');
    expect(stepOutput(step, 'out')).toBe('steps.my-step.outputs.out');
  });

  it('leaves an unset id unset', () => {
    expect(new BashStep({ name: 'x', run: bash`true` }).id).toBeUndefined();
  });

  it('throws on an id no slug can make valid', () => {
    expect(() => new BashStep({ name: 'x', id: '1st-step', run: bash`true` })).toThrow(/isn't a valid id/);
  });
});

describe('continue-on-error and timeout-minutes', () => {
  it.each([
    ['BashStep', (conf: object) => new BashStep({ name: 'x', run: bash`true`, ...conf })],
    ['ActionStep', (conf: object) => new ActionStep({ name: 'x', actionSpecifier: 'actions/checkout@v6', params: {}, ...conf })],
  ])('%s serializes continueOnError and timeoutMinutes', (_, make) => {
    const step = make({ continueOnError: true, timeoutMinutes: 2 });
    const yaml = step.toYaml().toString();
    expect(yaml).toContain('continue-on-error: true');
    expect(yaml).toContain('timeout-minutes: 2');
  });

  it.each([
    ['BashStep', (conf: object) => new BashStep({ name: 'x', run: bash`true`, ...conf })],
    ['ActionStep', (conf: object) => new ActionStep({ name: 'x', actionSpecifier: 'actions/checkout@v6', params: {}, ...conf })],
  ])('%s supports a string expression for continueOnError', (_, make) => {
    const step = make({ continueOnError: '${{ inputs.allow-failure }}' });
    expect(step.toYaml().toString()).toContain('continue-on-error: ${{ inputs.allow-failure }}');
  });

  it.each([
    ['BashStep', (conf: object) => new BashStep({ name: 'x', run: bash`true`, ...conf })],
    ['ActionStep', (conf: object) => new ActionStep({ name: 'x', actionSpecifier: 'actions/checkout@v6', params: {}, ...conf })],
  ])('%s omits continue-on-error and timeout-minutes when not provided', (_, make) => {
    const step = make({});
    const yaml = step.toYaml().toString();
    expect(yaml).not.toContain('continue-on-error');
    expect(yaml).not.toContain('timeout-minutes');
  });
});

describe('BashStep working-directory', () => {
  it('serializes working-directory when provided', () => {
    const step = new BashStep({ name: 'x', run: bash`true`, workingDirectory: 'infrastructure/terraform' });
    expect(step.toYaml().toString()).toContain('working-directory: infrastructure/terraform');
  });

  it('omits working-directory when not provided', () => {
    const step = new BashStep({ name: 'x', run: bash`true` });
    expect(step.toYaml().toString()).not.toContain('working-directory');
  });
});
