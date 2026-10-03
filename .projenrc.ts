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
  allowScripts: ['unrs-resolver'],
  pnpmOptions: {
    workspaceYamlOptions: {
      allowBuilds: { 'unrs-resolver': true },
    },
  },
  deps: ['tslib', 'yaml'], /* Runtime dependencies of this module. */
  gitignore: ['.context/'],
  // description: undefined,        /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                   /* Build dependencies for this module. */
  // packageName: undefined,        /* The "name" in package.json. */
});

// add this script to package.json eventually
// "codegen": "labuild run ./src/generate.ts"
// run with `pnpm exec projen`
project.synth();