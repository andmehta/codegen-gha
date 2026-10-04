import { bash } from '../../components/bashString.ts';
import { IfCondition } from '../../components/common.ts';
import { NormalJob, RUNS_ON } from '../../components/job.ts';
import { BashStep } from '../../components/step.ts';
import { Workflow } from '../../components/workflow.ts';
import { checkout, setupPnpm } from '../../lib/index.ts';

export const verifyGeneration = new Workflow({
  name: 'Verify Generation',
  trigger: { pull_request: null, push: { branches: ['main'] } },
  permissions: { 'id-token': 'read', 'contents': 'read', 'pull-requests': 'read', 'actions': 'read', 'checks': 'read' },
  env: {},
  jobs: {
    verify: new NormalJob({
      name: 'verify',
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
        new BashStep({
          name: 'Verify generated workflow files are up to date',
          run: bash`
pnpm run generate

git add src/generated-workflows
if ! git diff --staged --quiet -- src/generated-workflows; then
  echo "::error::Generated workflow files are out of date. Run 'pnpm run generate' and commit the result."
  git diff --staged -- src/generated-workflows
  exit 1
fi
`,
        }),
      ],
    }),
  },
});
