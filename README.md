# codegen-gha

[![build](https://github.com/andmehta/codegen-gha/actions/workflows/build.yml/badge.svg)](https://github.com/andmehta/codegen-gha/actions/workflows/build.yml)
[![release](https://github.com/andmehta/codegen-gha/actions/workflows/release.yml/badge.svg)](https://github.com/andmehta/codegen-gha/actions/workflows/release.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

`codegen-gha` is a TypeScript toolkit for defining GitHub Actions workflows as code and generating them into plain YAML. Instead of hand-writing and copy-pasting YAML across repos, you compose workflows, jobs, and steps using typed building blocks.

This is especially valuable in large CI setups: it keeps jobs and workflows consistent across many repos, and lets you make CI-wide changes (bumping a runner type, adding a permission, tweaking a shared step) in one place instead of editing dozens of YAML files by hand.

## Install

```sh
pnpm add -D codegen-gha
```

## Example

```ts
import { Workflow, NormalJob, RUNS_ON, BashStep, bash, IfCondition } from 'codegen-gha';

export const ci = new Workflow({
  name: 'CI',
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
  id-token: read
  contents: read
  pull-requests: read
  actions: read
  checks: read
env: {}
jobs:
  test:
    name: test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: ${{ true }}
    steps:
      - name: Run tests
        shell: bash
        run: |-
          pnpm test
```

To actually generate the workflow file, write the YAML out wherever your build tooling expects it, e.g. a `scripts/generate-workflows.ts` in your repo:

```ts
import fs from 'node:fs';
import { ci } from './ci';

fs.writeFileSync('.github/workflows/ci.yml', ci.serialize());
```

Then run it from the command line:

```sh
pnpm exec ts-node scripts/generate-workflows.ts
```

## Contributing

PR titles are checked for a semantic type prefix (e.g. `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`); pick whichever matches the change.
