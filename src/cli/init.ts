import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { CodegenGhaConfig, CONFIG_FILENAME, loadConfig } from './config.ts';
import { generate } from './generate.ts';

const DEFAULT_CONFIG: CodegenGhaConfig = {
  include: ['workflows/*.ts'],
  outDir: '.github/workflows',
  suffix: '.gen.yaml',
  commentHeader: 'DO NOT MODIFY. this file is generated using the `cgha generate` command\n generated from [{file}]',
};

const COMPONENT_IMPORT = /^import \{([^}]+)\} from '\.\.\/components\/\w+\.ts';$/;

/**
 * example-workflow.ts is a real, type-checked, tested source file (see
 * test/example-workflow.test.ts) rather than a hand-typed string, so it can't
 * silently drift from the actual library API. This collapses its internal
 * relative imports into the single public `codegen-gha` import a consumer
 * would actually write, and copies the rest of the file verbatim.
 */
function renderExampleWorkflow(): string {
  const sourcePath = path.join(import.meta.dirname, 'example-workflow.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const lines = source.split('\n');

  const names: string[] = [];
  const body = lines.filter(line => {
    const match = line.match(COMPONENT_IMPORT);
    if (!match) {
      return true;
    }
    names.push(...match[1].split(',').map(name => name.trim()));
    return false;
  });

  return [`import { ${names.join(', ')} } from 'codegen-gha';`, ...body].join('\n');
}

export async function init(cwd: string = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  const examplePath = path.join(cwd, 'workflows', 'example.ts');

  fs.writeFileSync(configPath, YAML.stringify(DEFAULT_CONFIG));
  console.log(`Wrote ${configPath}`);

  fs.mkdirSync(path.dirname(examplePath), { recursive: true });
  fs.writeFileSync(examplePath, renderExampleWorkflow());
  console.log(`Wrote ${examplePath}`);

  await generate(loadConfig(cwd), cwd);
}
