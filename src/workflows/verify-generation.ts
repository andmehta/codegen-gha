import { bash, ghaTemplateString } from '../components/bash-string.ts';
import { IfCondition } from '../components/if-condition.ts';
import { NormalJob, RUNS_ON } from '../components/job.ts';
import { ActionStep, BashStep, stepOutput } from '../components/step.ts';
import { Workflow } from '../components/workflow.ts';
import { checkout, setupPnpm } from '../lib/index.ts';

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
  exit 1
fi
`,
});

// VERIFY_STEP exits 1 when the diff is non-empty, so the reporting steps need failure()
// to run at all; a plain `if:` implicitly includes success()
const HAS_DIFF = IfCondition.stepOutputNotNull(VERIFY_STEP, 'diff');
const DIFF = ghaTemplateString(stepOutput(VERIFY_STEP, 'diff'));


export const verifyGeneration = new Workflow({
  name: 'Verify Generation',
  trigger: { pull_request: null, push: { branches: ['main'] } },
  permissions: { 'id-token': 'none', 'contents': 'read', 'pull-requests': 'write', 'actions': 'read', 'checks': 'read' },
  env: {},
  jobs: {
    verify: new NormalJob({
      name: 'verify',
      needs: [],
      runsOn: RUNS_ON.GITHUB_LATEST,
      timeoutMinutes: 10,
      env: {},
      services: {},
      steps: [
        checkout,
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

Run \`pnpm exec cgha generate\` and commit the result.

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
          actionSpecifier: 'peter-evans/create-or-update-comment@v5',
          params: {
            'issue-number': ghaTemplateString('github.event.pull_request.number'),
            'body': [
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
        new BashStep({
          name: 'Final check',
          condition: HAS_DIFF,
          run: bash`exit 1`,
        }),
      ],
    }),
  },
});
