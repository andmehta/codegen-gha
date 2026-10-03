import { bash } from '../components/bashString.ts';
import { IfConditionPlan } from '../components/common.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { BashStep } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { moto } from '../lib/services/moto.ts';
import { postgres } from '../lib/services/postgres.ts';
import { redis } from '../lib/services/redis.ts';
import { checkoutDepth2 } from '../lib/steps/setup.ts';

const testStep = new BashStep({
  name: 'Run tests',
  run: bash`
pnpm -F [...\${{ inputs.since_commit_sha }}] test
  ${7}
  ${22}
${null}
`,
});

const messyStep = new BashStep({
  name: 'Run tests',
  run: bash`
  INPUT_FILTER_EXCL=( \${{
    fromJSON(inputs.job_data)
      .prod_app_proto_branch_consumers[matrix.pkg]
      .pnpm_filter_deps_excl
  }} )
  INPUT_FILTER_INCL=( \${{
    fromJSON(inputs.job_data)
      .prod_app_proto_branch_consumers[matrix.pkg]
      .pnpm_filter_deps_incl
  }} )
  pnpm "\${INPUT_FILTER_EXCL[@]}" install --frozen-lockfile
  pnpm relay # because our frontends depend on protos for reasons that are Not Good™
  pnpm "\${INPUT_FILTER_EXCL[@]}" build
  pnpm "\${INPUT_FILTER_INCL[@]}" install --frozen-lockfile
`,
});

export const continuousIntegration = new Workflow({
  name: 'Continuous Integration',
  trigger: { pull_request: null, merge_queue: null, push: { branches: ['main'] } },
  permissions: {
    'id-token': 'write',
    'contents': 'read',
    'pull-requests': 'write',
    'actions': 'write',
    'checks': 'write',
  },
  env: {
    AWS_REGION: 'us-west-2',
    AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE: '1',
    SQITCH_IMAGE: 'public.ecr.aws/z2c7x8q5/sqitch:v1.3.0',
    AWS_ASSUME_ROLE_PROD: 'arn:aws:iam::355934147401:role/lattice-repo-github-oidc',
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
  },
  jobs: {
    my_job: new NormalJob({
      name: 'my_job',
      needs: [],
      condition: new IfConditionPlan({ planKey: 'run_my_job' }),
      runsOn: RUNS_ON.DEPOT_FOUR,
      timeoutMinutes: 15,
      env: {},
      services: {
        postgres,
        moto,
        redis,
      },
      steps: [checkoutDepth2, testStep, messyStep],
    }),
  },
});
