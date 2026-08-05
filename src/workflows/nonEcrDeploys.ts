import { bash, ghaTemplateString } from '../components/bashString';
import { ActionStep, BashStep } from '../components/step';
import { Workflow } from '../components/workflow';
import { NormalJob, RUNS_ON } from '../components/job';
import { checkoutDepth2, workspaceCleanupStep, setupStep, installStep } from '../lib/steps/setup';
import { IfConditionPlan } from '../components/common';

function makeMarsDeployJob({
  planKey,
  name,
  packageName,
}: {
  planKey: string;
  name: string;
  packageName: string;
}): NormalJob {
  return new NormalJob({
    name,
    services: {},
    needs: [],
    condition: new IfConditionPlan({ planKey }),
    timeoutMinutes: 30,
    runsOn: RUNS_ON.DEPOT_REGULAR,
    env: {
      GITHUB_CURRENT_COMMIT_SHA: ghaTemplateString('inputs.current-commit-sha'),
      CLOUDFLARE_API_TOKEN: ghaTemplateString('secrets.CLOUDFLARE_API_TOKEN'),
      CLOUDFLARE_ACCOUNT_ID: ghaTemplateString('secrets.CLOUDFLARE_ACCOUNT_ID'),
      CLOUDFLARE_PAGES_READ_TOKEN: ghaTemplateString('secrets.CLOUDFLARE_PAGES_READ_TOKEN'),
    },
    steps: [
      workspaceCleanupStep,
      checkoutDepth2,
      setupStep,
      installStep,
      new BashStep({
        name: 'Install only deps for this app',
        run: bash`
pnpm -F ${packageName}^... install
pnpm relay
pnpm -F ${packageName}^... build
pnpm -F ${packageName}... install
`,
      }),
      new BashStep({
        name: `Build ${packageName}`,
        run: bash`
pnpm -F ${packageName} build
`,
      }),
      new BashStep({
        name: `Deploy ${packageName}`,
        // Try three times
        run: bash`
echo 'Deploying ${packageName} for real'
pnpm -F ${packageName} deploy-prod || \
  (sleep 15 && pnpm -F ${packageName} deploy-prod) || \
  (sleep 15 && pnpm -F ${packageName} deploy-prod)
`,
      }),
    ],
  });
}

export const nonEcrDeploys = new Workflow({
  name: 'Non-ECR Deploys',
  trigger: {
    workflow_call: {
      inputs: {
        'current-commit-sha': { required: true, type: 'string' },
        'since-commit-sha': { required: true, type: 'string' },
        plan: { required: true, type: 'string' },
      },
      secrets: {
        AWS_ACCOUNT_ID_CI: { required: true },
        CLOUDFLARE_API_TOKEN_COPIED_FROM_CCI: { required: true },
        CLOUDFLARE_ACCOUNT_ID_COPIED_FROM_CCI_NOT_A_SECRET: { required: true },
        CLOUDFLARE_PAGES_READ_TOKEN: { required: true },
        CLOUDFLARE_API_TOKEN: { required: true },
        CLOUDFLARE_ACCOUNT_ID: { required: true },
        MARS_LATTICE_WEBSITE_PROXY_CF_TOKEN: { required: true },
      },
    },
  },
  permissions: {
    'id-token': 'write',
    contents: 'read',
    'pull-requests': 'write',
    checks: 'write',
    actions: 'read',
  },
  env: {
    AWS_REGION: 'us-west-2',
    AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE: '1',
    AWS_ASSUME_ROLE_PROD: 'arn:aws:iam::355934147401:role/lattice-repo-github-oidc',
  },
  jobs: {
    mars_build_and_deploy: makeMarsDeployJob({
      planKey: 'mars_build_and_deploy',
      name: 'mars_build_and_deploy',
      packageName: 'mars',
    }),
    mars_university_build_and_deploy: makeMarsDeployJob({
      planKey: 'mars_university_build_and_deploy',
      name: 'mars_university_build_and_deploy',
      packageName: 'mars-university',
    }),
    mars_language_files_build_and_deploy: makeMarsDeployJob({
      planKey: 'mars_language_files_build_and_deploy',
      name: 'mars_language_files_build_and_deploy',
      packageName: 'mars-language-files',
    }),
    mars_lattice_website_build_and_deploy: new NormalJob({
      name: 'mars_lattice_website_build_and_deploy',
      services: {},
      needs: [],
      condition: new IfConditionPlan({ planKey: 'mars_lattice_website_build_and_deploy' }),
      timeoutMinutes: 30,
      runsOn: RUNS_ON.DEPOT_REGULAR,
      env: {
        GITHUB_CURRENT_COMMIT_SHA: ghaTemplateString('inputs.current-commit-sha'),
        CLOUDFLARE_API_TOKEN: ghaTemplateString('secrets.MARS_LATTICE_WEBSITE_PROXY_CF_TOKEN'),
      },
      steps: [
        workspaceCleanupStep,
        checkoutDepth2,
        setupStep,
        installStep,
        new BashStep({
          name: 'Deploy mars-lattice-website',
          run: bash`
pnpm -F mars-lattice-website deploy-prod || \
  (sleep 15 && pnpm -F mars-lattice-website deploy-prod) || \
  (sleep 15 && pnpm -F mars-lattice-website deploy-prod)
`,
        }),
      ],
    }),
    mars_integrations_gateway_build_and_deploy: makeMarsDeployJob({
      planKey: 'mars_integrations_gateway_build_and_deploy',
      name: 'mars_integrations_gateway_build_and_deploy',
      packageName: 'mars-integrations-gateway',
    }),
    meepo_build_and_deploy: new NormalJob({
      name: 'Meepo build and deploy',
      runsOn: RUNS_ON.DEPOT_EIGHT,
      needs: [],
      services: {},
      condition: new IfConditionPlan({ planKey: 'meepo_build_and_deploy' }),
      timeoutMinutes: 30,
      env: {},
      steps: [
        workspaceCleanupStep,
        checkoutDepth2,
        setupStep,
        installStep,
        // TODO: extract
        new ActionStep({
          name: 'Configure AWS Credentials',
          actionSpecifier: 'aws-actions/configure-aws-credentials@v4',
          params: {
            'role-to-assume': ghaTemplateString('env.AWS_ASSUME_ROLE_PROD'),
            'role-session-name': 'gharolesessionprod',
            'aws-region': ghaTemplateString('env.AWS_REGION'),
          },
        }),
        new ActionStep({
          name: 'Meepo build and deploy',
          actionSpecifier: './.github/actions/meepo-build-and-deploy',
          params: {
            command: 'buildAndDeploy',
          },
        }),
        new ActionStep({
          name: 'Configure AWS Credentials',
          actionSpecifier: 'aws-actions/configure-aws-credentials@v4',
          env: {
            AWS_ASSUME_ROLE_PROD: 'arn:aws:iam::767397844093:role/lattice-repo-github-oidc',
          },
          params: {
            'role-to-assume': ghaTemplateString('env.AWS_ASSUME_ROLE_PROD'),
            'role-session-name': 'gharolesessionsecondary',
            'aws-region': 'eu-central-1',
          },
        }),
        new ActionStep({
          name: 'Meepo build and deploy (EMEA)',
          actionSpecifier: './.github/actions/meepo-build-and-deploy',
          env: {
            AWS_REGION: 'eu-central-1',
            DEPLOYMENT: 'emea-prod-1',
            ECR_ACCOUNT: '767397844093',
          },
          params: {
            command: 'buildAndDeploy:deployment',
          },
        }),
      ],
    }),
  },
});
