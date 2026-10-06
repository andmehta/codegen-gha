import { bash, ghaTemplateString } from '../components/bash-string.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { ActionStep, BashStep, stepOutput } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { checkout } from '../lib/index.ts';

/**
 * Exercises `cgha init` and `cgha generate` the way a user would: from the packed tarball
 * (the same artifact `npm publish` would upload) installed into an empty project. Checks
 * only what a user can observe, so it shouldn't need to change when the internals do.
 */

// The oldest Node.js `engines` allows, the first with type stripping on by default, so this fails
// if cgha starts relying on anything newer
const SETUP_PNPM_ON_MIN_NODE = new ActionStep({
  name: 'Setup pnpm on the minimum supported Node.js',
  actionSpecifier: 'pnpm/setup@v1',
  params: { cache: true, install: false, runtime: 'node@22.18.0' },
});

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
  trigger: { pull_request: { paths: ['src/workflows/e2e-init.ts', 'src/cli/**'] }, push: { branches: ['main'] } },

  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
  jobs: {
    init: new NormalJob({
      name: 'init',
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      steps: [
        checkout,
        SETUP_PNPM_ON_MIN_NODE,
        new BashStep({ name: 'Show Node.js version', run: bash`node --version` }),
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
          run: bash`
cd ${CONSUMER_DIR}
bash <(curl -sSfL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)
./actionlint .github/workflows/*.gen.yaml
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
        new BashStep({
          name: 'Deleting a workflow source removes its generated file',
          run: bash`
cd ${CONSUMER_DIR}
rm workflows/example.ts

pnpm exec cgha generate

if [ -e .github/workflows/example.gen.yaml ]; then
  echo "::error::cgha generate kept example.gen.yaml after workflows/example.ts was deleted"
  exit 1
fi
if [ ! -f .github/workflows/verify-generation.gen.yaml ]; then
  echo "::error::cgha generate removed verify-generation.gen.yaml, whose source still exists"
  exit 1
fi
`,
        }),
        new BashStep({
          name: 'Unsupported TypeScript fails with a hint',
          run: bash`
cd ${CONSUMER_DIR}
cat > workflows/enum.ts <<'EOF'
enum Color { Red }
export const color = Color.Red;
EOF

if output=$(pnpm exec cgha generate 2>&1); then
  echo "::error::cgha generate succeeded on a workflow file using an enum"
  exit 1
fi
if ! grep -q 'no enums' <<<"$output"; then
  echo "::error::cgha generate failed without the type stripping hint"
  echo "$output"
  exit 1
fi
rm workflows/enum.ts
`,
        }),
      ],
    }),
  },
});
