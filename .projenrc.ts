import { github, javascript, typescript } from 'projen';
const project = new typescript.TypeScriptProject({
  name: 'codegen-gha',
  description: 'Define GitHub Actions workflows in TypeScript and generate them into plain YAML',
  repository: 'https://github.com/andmehta/codegen-gha.git',
  authorName: 'Andrew Mehta',
  keywords: ['github-actions', 'github', 'workflow', 'ci', 'codegen', 'yaml', 'typescript', 'cli'],
  // Publish via GitHub OIDC trusted publishing, so no NPM_TOKEN secret is needed. The trusted
  // publisher must be configured on npmjs.com for this repo and the release.yml workflow.
  releaseToNpm: true,
  npmTrustedPublishing: true,
  npmProvenance: true,
  // The first public release jumps from the v0.0.x tags to 0.1.0. Once a v0.1.x tag exists this
  // prints nothing, so later releases fall back to the normal commit-derived bump. Safe to delete then.
  nextVersionCommand: '[ -n "$(git tag -l \'v0.1.*\')" ] || echo 0.1.0',
  packageManager: javascript.NodePackageManager.PNPM,
  githubOptions: {
    // Use the default GITHUB_TOKEN instead of requiring a PROJEN_GITHUB_TOKEN PAT secret.
    // Note: pushes made with GITHUB_TOKEN don't re-trigger other workflows.
    projenCredentials: github.GithubCredentials.fromPersonalAccessToken({ secret: 'GITHUB_TOKEN' }),
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: ['feat', 'fix', 'chore', 'docs', 'refactor'],
      },
    },
  },
  // Only emit the corepack `packageManager` field, not `devEngines.packageManager`.
  // pnpm warns and ignores `packageManager` when both are present.
  addPackageManagerToDevEngines: false,
  projenrcTs: true,
  defaultReleaseBranch: 'main',
  srcdir: 'src',
  testdir: 'test',
  typescriptVersion: '~6.0.0',
  // pnpm 10+ blocks package build (postinstall) scripts by default, so this allow lists it
  allowScripts: ['unrs-resolver', 'esbuild'],
  pnpmOptions: {
    workspaceYamlOptions: {
      allowBuilds: { 'unrs-resolver': true, 'esbuild': true },
    },
  },
  deps: ['tslib', 'yaml', 'glob@^13', 'tsx', 'yargs'], /* Runtime dependencies of this module. */
  bin: {
    cgha: 'lib/cli/index.js',
  },
  // No barrel file: consumers import subpaths directly (e.g. `codegen-gha/components/workflow`),
  // resolved by the wildcard "exports" map below instead of a root `main`/`types` entrypoint.
  entrypoint: '',
  // This package is ESM-only: no CommonJS output, no `require()`.
  tsconfig: {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: 'NodeNext',
      moduleResolution: javascript.TypeScriptModuleResolution.NODE_NEXT,
      isolatedModules: true,
      // Allows literal `.ts` extensions in relative imports instead of NodeNext's required `.js`.
      allowImportingTsExtensions: true,
    },
  },
  // Vitest (not Jest) is used for tests; see the `test` task override and vitest.config.ts below.
  jest: false,
  devDeps: ['vitest', '@vitest/coverage-v8', '@types/yargs'],
  gitignore: ['.context/', '/test-reports/'],
  npmIgnoreOptions: {
    // This repo's own generator config, not something consumers need
    ignorePatterns: ['/coverage/', '/test-reports/', '/vitest.config.ts', '/codegen-gha.yaml', '/pnpm-workspace.yaml'],
  },
});

project.package.addField('type', 'module');
// Set directly rather than via `minNodeVersion`, which would also pin every CI job to this exact
// version (trusted publishing needs a much newer npm). 20.11 is the first with `import.meta.dirname`.
project.package.addEngine('node', '>=20.11.0');
project.package.addField('exports', {
  './package.json': './package.json',
  './*': {
    types: './lib/*.d.ts',
    default: './lib/*.js',
  },
});

// Prepend so tests run before the eslint step TypeScriptProject already added.
project.testTask.prependExec('vitest run --coverage');
project.addTask('test:watch', {
  description: 'Run vitest in watch mode',
  exec: 'vitest',
});
project.addTask('generate', {
  description: "Regenerate this repo's own workflow files from src/workflows/ via tsx, no build required",
  exec: 'tsx src/cli/index.ts generate',
});

// Rewrites the `.ts` extensions above to `.js` at emit; not yet in projen's typed options.
project.tsconfig?.file.addOverride('compilerOptions.rewriteRelativeImportExtensions', true);

// `cgha init` reads these real, type-checked source files at runtime and rewrites them into the
// scaffolded workflows, rather than keeping separate hand-typed copies that can drift from them.
project.postCompileTask.exec('cp src/cli/example-workflow.ts lib/cli/example-workflow.ts');
project.postCompileTask.exec('cp src/workflows/verify-generation.ts lib/workflows/verify-generation.ts');
project.postCompileTask.exec('cp src/lib/index.ts lib/lib/index.ts');

project.synth();
