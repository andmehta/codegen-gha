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
import { Workflow } from 'codegen-gha/components/workflow';
import { IfCondition } from 'codegen-gha/components/common';
import { NormalJob, RUNS_ON } from 'codegen-gha/components/job';
import { BashStep } from 'codegen-gha/components/step';
import { bash } from 'codegen-gha/components/bash-string';

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

## Generating workflow files

`codegen-gha` ships a `cgha` CLI.

### Quick start: `cgha init`

```sh
pnpm exec cgha init
```

This sets up a new repo in one go. 
First it writes a default `codegen-gha.yaml`. Then it writes a default workflows directory `workflows/` with two files, a `verify-generation.ts` to provide CI support for a code generation workflow and `example.ts` with a sample `Workflow`.
Finally it writes a `lib/index.ts` with a few shared steps (`checkout`, `setupPnpm`) that those workflows import.

### Sharing steps with `lib/`

Keep each file in `workflows/` focused on a single `Workflow`. When a step, job or condition is
used by more than one workflow, define it once in `lib/` and import it:

```ts
// lib/index.ts
import { ActionStep } from 'codegen-gha/components/step';

export const checkout = new ActionStep({
  name: 'Checkout',
  actionSpecifier: 'actions/checkout@v6',
  params: {},
});
```

```ts
// workflows/ci.ts
import { checkout } from '../lib/index.ts';
// ...
steps: [checkout, /* ... */],
```

That way a change like bumping an action version or a pinned tool version happens in one place,
and every workflow that uses it picks it up the next time you run `cgha generate`.

`lib/` isn't matched by the default `include` glob, so nothing in it is generated on its own.
Only exported `Workflow` instances in `workflows/` become files in `.github/workflows`.

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
pnpm exec cgha generate
```

This scans every file matching `include`, picks up any exported `Workflow` instance, and writes one file per workflow into `outDir` as `<slugified-name><suffix>` — e.g. the `ci.ts` example above becomes `.github/workflows/ci.gen.yaml`:


## Contributing

PR titles are checked for a semantic type prefix (e.g. `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`); pick whichever matches the change.
