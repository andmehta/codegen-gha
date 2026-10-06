import { github, javascript, typescript } from 'projen';
const project = new typescript.TypeScriptProject({
  name: 'codegen-gha',
  description: 'Define GitHub Actions workflows in TypeScript and generate them into plain YAML',
  repository: 'https://github.com/andmehta/codegen-gha.git',
  authorName: 'Andrew Mehta',
  keywords: ['github-actions', 'github', 'workflow', 'ci', 'codegen', 'yaml', 'typescript', 'cli'],
  releaseToNpm: true,
  npmTrustedPublishing: true,
  npmProvenance: true,
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
  deps: ['tslib', 'yaml', 'glob@^13', 'yargs'], /* Runtime dependencies of this module. */
  bin: {
    cgha: 'lib/cli/index.js',
  },
  entrypoint: '',
  tsconfig: {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: 'NodeNext',
      moduleResolution: javascript.TypeScriptModuleResolution.NODE_NEXT,
      isolatedModules: true,
      allowImportingTsExtensions: true,
    },
  },
  // Vitest (not Jest) is used for tests; see the `test` task override and vitest.config.ts below.
  jest: false,
  devDeps: ['vitest', '@vitest/coverage-v8', '@types/yargs'],
  gitignore: ['.context/', '/test-reports/'],
  npmIgnoreOptions: {
    // This repo's own generator config, not something consumers need
    ignorePatterns: ['/coverage/', '/test-reports/', '/vitest.config.ts', '/codegen-gha.yaml', '/pnpm-workspace.yaml', '/workflows/e2e-init.ts'],
  },
});

project.package.addField('type', 'module');
// Set directly rather than via `minNodeVersion`, which would also pin every CI job to this exact
// version (trusted publishing needs a much newer npm). 22.18 is the first with type stripping on by
// default, which `cgha generate` uses to load .ts workflow files.
project.package.addEngine('node', '>=22.18.0');
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
  description: "Regenerate this repo's own workflow files from src/workflows/ via Node's type stripping, no build required",
  exec: 'node src/cli/index.ts generate',
});

// Rewrites the `.ts` extensions above to `.js` at emit; not yet in projen's typed options.
project.tsconfig?.file.addOverride('compilerOptions.rewriteRelativeImportExtensions', true);
// Reject TypeScript that Node's type stripping can't run (enums, namespaces, parameter properties,
// type imports without `type`), since `cgha generate` and `init`'s templates run .ts files directly.
project.tsconfig?.file.addOverride('compilerOptions.erasableSyntaxOnly', true);
project.tsconfig?.file.addOverride('compilerOptions.verbatimModuleSyntax', true);

// `cgha init` reads these real, type-checked source files at runtime and rewrites them into the
// scaffolded workflows, rather than keeping separate hand-typed copies that can drift from them.
project.postCompileTask.exec('cp src/cli/example-workflow.ts lib/cli/example-workflow.ts');
project.postCompileTask.exec('cp src/workflows/verify-generation.ts lib/workflows/verify-generation.ts');
project.postCompileTask.exec('cp src/lib/index.ts lib/lib/index.ts');

// Stage releases on npm instead of publishing them directly, so a version only goes live after a
// maintainer approves it with 2FA
const releaseWorkflow = project.github?.tryFindWorkflow('release');
releaseWorkflow?.file?.addOverride('jobs.release_npm.name', 'Stage on npm');
releaseWorkflow?.file?.addOverride('jobs.release_npm.steps.3.name', 'Stage');
releaseWorkflow?.file?.addOverride('jobs.release_npm.steps.3.run', [
  'for file in dist/js/*.tgz; do',
  '  if [ "${PUBLIB_DRYRUN:-}" = "true" ]; then',
  '    echo "Dry run: would stage $file"',
  '  else',
  '    npx -y npm@12 stage publish --tag "$NPM_DIST_TAG" --access public "$file"',
  '  fi',
  'done',
].join('\n'));

project.synth();
