import { github, javascript, typescript } from 'projen';
const project = new typescript.TypeScriptProject({
  name: 'codegen-gha',
  packageManager: javascript.NodePackageManager.PNPM,
  githubOptions: {
    // Use the default GITHUB_TOKEN instead of requiring a PROJEN_GITHUB_TOKEN PAT secret.
    // Note: pushes made with GITHUB_TOKEN don't re-trigger other workflows.
    projenCredentials: github.GithubCredentials.fromPersonalAccessToken({ secret: 'GITHUB_TOKEN' }),
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: ['feat', 'fix', 'chore', 'docs'],
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
  allowScripts: ['unrs-resolver'],
  pnpmOptions: {
    workspaceYamlOptions: {
      allowBuilds: { 'unrs-resolver': true },
    },
  },
  deps: ['tslib', 'yaml'], /* Runtime dependencies of this module. */
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
  devDeps: ['vitest', '@vitest/coverage-v8'],
  gitignore: ['.context/', '/test-reports/'],
  npmIgnoreOptions: {
    ignorePatterns: ['/coverage/', '/test-reports/', '/vitest.config.ts'],
  },
  // description: undefined,        /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,        /* The "name" in package.json. */
});

project.package.addField('type', 'module');

// Prepend so tests run before the eslint step TypeScriptProject already added.
project.testTask.prependExec('vitest run --coverage');
project.addTask('test:watch', {
  description: 'Run vitest in watch mode',
  exec: 'vitest',
});

// Rewrites the `.ts` extensions above to `.js` at emit; not yet in projen's typed options.
project.tsconfig?.file.addOverride('compilerOptions.rewriteRelativeImportExtensions', true);

project.synth();
