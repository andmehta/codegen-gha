import { bash, ghaTemplateString } from '../components/bash-string.ts';
import { IfCondition } from '../components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { BashStep, stepOutput } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { checkout, setupPnpm } from '../lib/index.ts';

/**
 * Exercises `cgha init` and `cgha generate` the way a user would: from the packed tarball
 * (the same artifact `npm publish` would upload) installed into an empty project. Checks
 * only what a user can observe, so it shouldn't need to change when the internals do.
 */

// Outside the checkout, so nothing can resolve through this repo's workspace or node_modules
const CONSUMER_DIR = '"$RUNNER_TEMP/consumer"';

const PACK_STEP = new BashStep({
  name: 'Pack codegen-gha',
  id: 'pack',
  run: bash`
pnpm compile
pnpm post-compile
pnpm package
echo "tarball=$(ls "$PWD"/dist/js/codegen-gha-*.tgz)" >> "$GITHUB_OUTPUT"
`,
});

export const e2eInit = new Workflow({
  name: 'E2E Init',
  trigger: { pull_request: null, push: { branches: ['main'] } },
  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
  env: {},
  jobs: {
    init: new NormalJob({
      name: 'init',
      needs: [],
      condition: new IfCondition({ expression: 'true' }),
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      env: {},
      services: {},
      steps: [
        checkout,
        setupPnpm,
        new BashStep({ name: 'Install dependencies', run: bash`pnpm install --frozen-lockfile` }),
        PACK_STEP,
        new BashStep({
          name: 'Install the tarball into an empty project',
          env: { TARBALL: ghaTemplateString(stepOutput(PACK_STEP, 'tarball')) },
          run: bash`
mkdir -p ${CONSUMER_DIR}
cd ${CONSUMER_DIR}
pnpm init
pnpm add "$TARBALL"
`,
        }),
        new BashStep({
          name: 'cgha init writes the starter files',
          run: bash`
cd ${CONSUMER_DIR}
pnpm exec cgha init

for f in codegen-gha.yaml workflows/example.ts workflows/verify-generation.ts lib/index.ts; do
  if [ ! -f "$f" ]; then
    echo "::error::cgha init did not write $f"
    exit 1
  fi
done
`,
        }),
        new BashStep({
          name: 'cgha generate writes workflows from them',
          run: bash`
cd ${CONSUMER_DIR}
pnpm exec cgha generate

for f in .github/workflows/example.gen.yaml .github/workflows/verify-generation.gen.yaml; do
  if [ ! -f "$f" ]; then
    echo "::error::cgha generate did not write $f"
    exit 1
  fi
done
`,
        }),
        new BashStep({
          name: 'Generated workflows pass actionlint',
          // The ignores are known generator output that's valid but noisy: an empty top-level
          // env, the templates' constant if: true, and intentional backticks in single quotes
          run: bash`
cd ${CONSUMER_DIR}
bash <(curl -sSfL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)
./actionlint \
  -ignore 'should not be empty' \
  -ignore 'constant expression' \
  -ignore 'SC2016' \
  .github/workflows/*.gen.yaml
`,
        }),
        new BashStep({
          name: 'Regenerating is a no-op',
          run: bash`
cd ${CONSUMER_DIR}
echo node_modules > .gitignore
rm -f actionlint
git init --quiet
git add -A
git -c user.name=e2e -c user.email=e2e@example.com commit --quiet -m 'cgha init'

pnpm exec cgha generate

if [ -n "$(git status --porcelain)" ]; then
  echo "::error::A second cgha generate changed files it had already generated"
  git status --porcelain
  git diff
  exit 1
fi
`,
        }),
      ],
    }),
  },
});
