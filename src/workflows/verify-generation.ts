import { bash, ghaTemplateString } from '../components/bash-string.ts';
import { IfCondition } from '../components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { ActionStep, BashStep, stepOutput } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { checkout, setupNode, setupPnpm } from '../lib/index.ts';

const VERIFY_STEP = new BashStep({
  name: 'Verify generated workflow files are up to date',
  id: 'verify',
  run: bash`
pnpm run generate

# Mark new files as intent-to-add so they show up in the diff against HEAD
git add --intent-to-add .
diff=$(git diff HEAD)

if [ -n "$diff" ]; then
  {
    echo "diff<<GENERATION_DIFF_EOF"
    echo "$diff"
    echo "GENERATION_DIFF_EOF"
  } >> "$GITHUB_OUTPUT"
  echo "::error::Generated workflow files are out of date. Run 'pnpm run generate' and commit the result."
fi
`,
});

const HAS_DIFF = IfCondition.stepOutputNotNull(VERIFY_STEP, 'diff');
const NO_DIFF = IfCondition.stepOutputNull(VERIFY_STEP, 'diff');
const DIFF = ghaTemplateString(stepOutput(VERIFY_STEP, 'diff'));

const STICKY_COMMENT = 'marocchino/sticky-pull-request-comment@v3.0.5';
const COMMENT_HEADER = 'codegen-gha-verify-generation';


export const verifyGeneration = new Workflow({
  name: 'Verify Generation',
  trigger: { pull_request: null, push: { branches: ['main'] } },
  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'write', 'actions': 'read', 'checks': 'read' },
  jobs: {
    verify: new NormalJob({
      name: 'verify',
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      steps: [
        checkout,
        setupNode,
        setupPnpm,
        new BashStep({ name: 'Install dependencies', run: bash`pnpm install --frozen-lockfile` }),
        VERIFY_STEP,
        new BashStep({
          name: 'Post diff to job summary',
          condition: HAS_DIFF,
          env: { DIFF },
          run: bash`
{
  cat <<'EOF'
## Generated workflow files are out of date

Run \`pnpm run generate\` and commit the result.

\`\`\`diff
EOF
  echo "$DIFF"
  echo '\`\`\`'
} >> "$GITHUB_STEP_SUMMARY"
`,
        }),
        new ActionStep({
          name: 'Comment diff on PR',
          // push events to main have no PR to comment on
          condition: IfCondition.isPullRequest().and(HAS_DIFF),
          actionSpecifier: STICKY_COMMENT,
          params: {
            header: COMMENT_HEADER,
            // Collapse the previous diff as outdated and post the current one
            hide_and_recreate: true,
            hide_classify: 'OUTDATED',
            message: [
              '## Generated workflow files are out of date',
              '',
              'Run `pnpm run generate` and commit the result.',
              '',
              '```diff',
              DIFF,
              '```',
            ].join('\n'),
          },
        }),
        new ActionStep({
          name: 'Resolve the diff comment on PR',
          // A no-op when this PR has no visible diff comment
          condition: IfCondition.isPullRequest().and(NO_DIFF),
          actionSpecifier: STICKY_COMMENT,
          params: {
            header: COMMENT_HEADER,
            hide: true,
            hide_classify: 'RESOLVED',
          },
        }),
        new BashStep({
          name: 'Fail Job if we did not generate everything',
          condition: HAS_DIFF,
          run: bash`exit 1`,
        }),
      ],
    }),
  },
});
