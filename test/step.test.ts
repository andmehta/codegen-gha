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
