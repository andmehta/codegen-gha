import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { CONFIG_FILENAME, DEFAULT_CONFIG } from './config.ts';

const COMPONENT_IMPORT = /^import \{([^}]+)\} from '\.\.\/components\/([\w-]+)\.ts';$/;

/**
 * example-workflow.ts is a real, type-checked, tested source file (see
 * test/example-workflow.test.ts) rather than a hand-typed string, so it can't
 * silently drift from the actual library API. This rewrites its internal
 * relative imports into the public `codegen-gha/components/*` subpaths a
 * consumer would actually write, and copies the rest of the file verbatim.
 */
function renderExampleWorkflow(): string {
  const sourcePath = path.join(import.meta.dirname, 'example-workflow.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const lines = source.split('\n');

  return lines
    .map(line => {
      const match = line.match(COMPONENT_IMPORT);
      if (!match) {
        return line;
      }
      const [, names, component] = match;
      return `import {${names}} from 'codegen-gha/components/${component}';`;
    })
    .join('\n');
}

export async function init(cwd: string = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  const examplePath = path.join(cwd, 'workflows', 'example.ts');

  fs.writeFileSync(configPath, YAML.stringify(DEFAULT_CONFIG));
  console.log(`Wrote ${configPath}`);

  fs.mkdirSync(path.dirname(examplePath), { recursive: true });
  fs.writeFileSync(examplePath, renderExampleWorkflow());
  console.log(`Wrote ${examplePath}`);
}
