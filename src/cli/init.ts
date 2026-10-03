import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from './config.ts';
import { generate } from './generate.ts';

const DEFAULT_CONFIG = `include: "workflows/*.ts"
outDir: .github/workflows
suffix: .gen.yaml
commentHeader: "this file is generated using cgha generate {file}"
`;

const EXAMPLE_WORKFLOW = `import { Workflow, NormalJob, RUNS_ON, BashStep, bash, IfCondition } from 'codegen-gha';

export const example = new Workflow({
  name: 'Example',
  trigger: { pull_request: null },
  permissions: { 'id-token': 'read', contents: 'read', 'pull-requests': 'read', actions: 'read', checks: 'read' },
  env: {},
  jobs: {
    test: new NormalJob({
      name: 'test',
      needs: [],
      condition: new IfCondition({ expression: 'true' }),
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      env: {},
      services: {},
      steps: [new BashStep({ name: 'Run tests', run: bash\`pnpm test\` })],
    }),
  },
});
`;

export async function init(cwd: string = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  const examplePath = path.join(cwd, 'workflows', 'example.ts');

  if (fs.existsSync(configPath)) {
    throw new Error(`${CONFIG_FILENAME} already exists in ${cwd}`);
  }
  if (fs.existsSync(examplePath)) {
    throw new Error(`${examplePath} already exists`);
  }

  fs.writeFileSync(configPath, DEFAULT_CONFIG);
  console.log(`Wrote ${configPath}`);

  fs.mkdirSync(path.dirname(examplePath), { recursive: true });
  fs.writeFileSync(examplePath, EXAMPLE_WORKFLOW);
  console.log(`Wrote ${examplePath}`);

  await generate(cwd);
}
