import { describe, expect, it } from 'vitest';
import { example } from '../src/cli/example-workflow.ts';

describe('example workflow', () => {
  it('serializes to valid yaml', () => {
    const yaml = example.serialize();
    expect(yaml).toContain('name: Example');
    expect(yaml).toContain('name: test');
  });
});
