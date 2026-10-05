import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { CONFIG_FILENAME, DEFAULT_CONFIG } from './config.ts';

// Only components come from the package; `../lib/*` imports are left alone, since init scaffolds
// the consumer's own lib/ next to their workflows/ with the same relative layout as this repo
const COMPONENT_IMPORT = /^import \{([^}]+)\} from '\.\.\/components\/([\w-]+)\.ts';$/;

// This repo runs its generator from source through a projen task, which a consumer won't have,
// so scaffolded workflows call the installed CLI instead
export const INTERNAL_GENERATE_COMMAND = 'pnpm run generate';
export const PUBLIC_GENERATE_COMMAND = 'cgha generate';

interface Template {
  /** Real source file, relative to this one; post-compile copies each next to the emitted js */
  source: string;
  /** Where it's written, relative to the consumer's repo root */
  dest: string;
}

export const TEMPLATES: Template[] = [
  { source: 'example-workflow.ts', dest: 'workflows/example.ts' },
  { source: '../workflows/verify-generation.ts', dest: 'workflows/verify-generation.ts' },
  { source: '../lib/index.ts', dest: 'lib/index.ts' },
];

/**
 * Templates are real, type-checked, tested source files (see test/init.test.ts) rather than
 * hand-typed strings, so they can't silently drift from the actual library API. This rewrites
 * their component imports into the public `codegen-gha/components/*` subpaths a consumer would
 * actually write, swaps in the consumer's generate command, and copies the rest verbatim.
 */
export function renderTemplate(template: Template): string {
  const sourcePath = path.join(import.meta.dirname, template.source);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const lines = source.split('\n');

  return lines
    .map(line => {
      const match = line.match(COMPONENT_IMPORT);
      if (!match) {
        return line.replaceAll(INTERNAL_GENERATE_COMMAND, PUBLIC_GENERATE_COMMAND);
      }
      const [, names, component] = match;
      return `import {${names}} from 'codegen-gha/components/${component}';`;
    })
    .join('\n');
}

export async function init(cwd: string = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILENAME);

  fs.writeFileSync(configPath, YAML.stringify(DEFAULT_CONFIG));
  console.log(`Wrote ${configPath}`);

  for (const template of TEMPLATES) {
    const destPath = path.join(cwd, template.dest);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, renderTemplate(template));
    console.log(`Wrote ${destPath}`);
  }
}
