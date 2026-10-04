import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INTERNAL_GENERATE_COMMAND, PUBLIC_GENERATE_COMMAND, renderTemplate, TEMPLATES } from '../src/cli/init.ts';
import { verifyGeneration } from '../src/workflows/verify-generation.ts';

const IMPORT_SOURCE = / from '([^']+)';$/;

describe('init templates', () => {
  describe.each(TEMPLATES)('$dest', template => {
    const rendered = renderTemplate(template);
    const importSources = rendered
      .split('\n')
      .filter(line => line.startsWith('import '))
      .map(line => line.match(IMPORT_SOURCE)![1]);

    it('imports components from the package and everything else from other scaffolded files', () => {
      expect(importSources.length).toBeGreaterThan(0);
      const scaffolded = TEMPLATES.map(t => t.dest);
      for (const source of importSources) {
        if (source.startsWith('codegen-gha/')) {
          expect(source).toMatch(/^codegen-gha\/components\/[\w-]+$/);
        } else {
          // a relative import has to land on a file init also writes, or the consumer's copy breaks
          expect(scaffolded).toContain(path.join(path.dirname(template.dest), source));
        }
      }
    });

    it('uses the installed cli rather than this repo\'s generate task', () => {
      expect(rendered).not.toContain(INTERNAL_GENERATE_COMMAND);
    });
  });

  it('swaps in the public generate command for verify-generation', () => {
    const template = TEMPLATES.find(t => t.dest === 'workflows/verify-generation.ts')!;
    expect(renderTemplate(template)).toContain(PUBLIC_GENERATE_COMMAND);
  });
});

describe('verify-generation workflow', () => {
  it('serializes to valid yaml', () => {
    const yaml = verifyGeneration.serialize();
    expect(yaml).toContain('name: Verify Generation');
    expect(yaml).toContain('id: verify');
  });
});
