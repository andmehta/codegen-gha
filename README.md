# codegen-gha

[![build](https://github.com/andmehta/codegen-gha/actions/workflows/build.yml/badge.svg)](https://github.com/andmehta/codegen-gha/actions/workflows/build.yml)
[![release](https://github.com/andmehta/codegen-gha/actions/workflows/release.yml/badge.svg)](https://github.com/andmehta/codegen-gha/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/codegen-gha.svg)](https://www.npmjs.com/package/codegen-gha)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

`codegen-gha` is a TypeScript toolkit for defining GitHub Actions workflows as code and generating them into plain YAML. Instead of hand-writing and copy-pasting YAML across repos, you compose workflows, jobs, and steps using typed building blocks.

This is especially valuable in large CI setups: it keeps jobs and workflows consistent across many repos, and lets you make CI-wide changes (bumping a runner type, adding a permission, tweaking a shared step) in one place instead of editing dozens of YAML files by hand.

## Install

```sh
pnpm add -D codegen-gha
# or
npm install --save-dev codegen-gha
# or
yarn add -D codegen-gha
```

Requires Node.js 20.11 or later. The package is ESM-only, so import it with `import`, not `require()`.

> [!NOTE]
> `codegen-gha` is pre-1.0. Breaking changes can land in any minor release, so consider pinning the version.

## Example

```ts
import { Workflow } from 'codegen-gha/components/workflow';
import { NormalJob, RUNS_ON } from 'codegen-gha/components/job';
import { BashStep } from 'codegen-gha/components/step';
import { bash } from 'codegen-gha/components/bash-string';

export const ci = new Workflow({
  name: 'CI',
  trigger: { pull_request: null },
  permissions: { 'id-token': 'none', contents: 'read', 'pull-requests': 'read', actions: 'read', checks: 'read' },
  env: {},
  jobs: {
    test: new NormalJob({
      name: 'test',
      needs: [],
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      env: {},
      services: {},
      steps: [new BashStep({ name: 'Run tests', run: bash`pnpm test` })],
    }),
  },
});
```

Which serializes to:

```yaml
name: CI
on:
  pull_request:
permissions:
  id-token: none
  contents: read
  pull-requests: read
  actions: read
  checks: read
jobs:
  test:
    name: test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Run tests
        shell: bash
        run: |-
          pnpm test
```

## Generating workflow files

`codegen-gha` ships a `cgha` CLI.

### Quick start: `cgha init`

```sh
pnpm exec cgha init   # or: npx cgha init
```

This scaffolds a working setup in the current directory:

- `codegen-gha.yaml`: the generator config (see below)
- `workflows/example.ts`: an example workflow to edit or replace
- `workflows/verify-generation.ts`: a CI workflow that fails if the generated YAML is out of date with its TypeScript source
- `lib/index.ts`: a place for shared steps and jobs (see [`lib/`](#lib))

Then run `pnpm exec cgha generate` to write the YAML into `.github/workflows/`.

### Config reference

Add a `codegen-gha.yaml` to the root of your repo:

```yaml
# glob of files to scan for exported Workflow instances
include: 
  - "workflows/*.ts"
# where to write generated files
outDir: .github/workflows
# filename suffix, marks the file as generated
suffix: .gen.yaml
# {file} is replaced with the source path
commentHeader: "this file is generated using cgha generate {file}"
```

Then run:

```sh
pnpm exec cgha generate   # or: npx cgha generate
```

This scans every file matching `include`, picks up any exported `Workflow` instance, and writes one file per workflow into `outDir` as `<slugified-name><suffix>` — e.g. the `ci.ts` example above becomes `.github/workflows/ci.gen.yaml`. Commit the generated files: GitHub only runs the YAML, not the TypeScript.

#### `lib/`

This is how best to organize repeated YAML. Things like standard actions can be defined here and imported into the workflows.

## Contributing

PR titles are checked for a semantic type prefix (e.g. `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`); pick whichever matches the change.

### Releases

Releases are automated. Every merge to `main` runs [`release.yml`](.github/workflows/release.yml), which bumps the version from the conventional commit history, tags it, and creates a GitHub Release with the changelog. Release only _stages_ on [npm](https://www.npmjs.com/package/codegen-gha).

A staged version isn't installable until a maintainer approves it. Please reach out if a release needs to be available.
