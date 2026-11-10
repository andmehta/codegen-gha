import YAML from 'yaml';

import type { BashString } from './bash-string.ts';
import { slugify, undefinedIfEmpty } from './common.ts';
import type { IfCondition } from './if-condition.ts';
import { WorkflowComponent } from './workflow-component.ts';

// GitHub requires a step id to start with a letter or `_` and contain only alphanumerics, `-` and `_`
const VALID_STEP_ID = /^[a-z_][a-z0-9_-]*$/;

/** @internal exported for tests */
export function toStepId(id: string | undefined): string | undefined {
  if (id === undefined) return undefined;
  const slug = slugify(id);
  if (!VALID_STEP_ID.test(slug)) {
    throw new Error(`Step id '${id}' slugifies to '${slug}', which isn't a valid id: it must start with a letter or _`);
  }
  return slug;
}

/** A shell GitHub Actions runners support natively for `shell:`. */
export type Shell = 'bash' | 'pwsh' | 'python' | 'sh' | 'cmd' | 'powershell';

export interface BashStepConf {
  name: string;
  run: BashString;
  id?: string;
  condition?: IfCondition;
  env?: Record<string, string>;
  continueOnError?: boolean | string;
  timeoutMinutes?: number;
  workingDirectory?: string;
  /** Omit to fall back to the job's `defaults.run.shell`, or GitHub's own default of `bash -e {0}`. */
  shell?: Shell;
}
export class BashStep extends WorkflowComponent {
  private name: string;
  private run: BashString;
  public readonly id: string | undefined;
  private condition: IfCondition | undefined;
  private env: Record<string, string> | undefined;
  private continueOnError: boolean | string | undefined;
  private timeoutMinutes: number | undefined;
  private workingDirectory: string | undefined;
  private shell: Shell | undefined;
  constructor(conf: BashStepConf) {
    super();
    const { name, run, id, condition, env, continueOnError, timeoutMinutes, workingDirectory, shell } = conf;
    this.name = name;
    this.run = run;
    this.id = toStepId(id);
    this.condition = condition;
    this.env = env;
    this.continueOnError = continueOnError;
    this.timeoutMinutes = timeoutMinutes;
    this.workingDirectory = workingDirectory;
    this.shell = shell;
  }
  toYaml(): YAML.Document {
    const doc = new YAML.Document({
      'name': this.name,
      'id': this.id,
      'if': this.condition?.toYaml(),
      'env': undefinedIfEmpty(this.env),
      'continue-on-error': this.continueOnError,
      'timeout-minutes': this.timeoutMinutes,
      'shell': this.shell,
      'working-directory': this.workingDirectory,
      // run: this.run,
    });
    const runNode = doc.createNode(this.run);
    runNode.type = 'BLOCK_LITERAL';
    doc.addIn(['run'], runNode);

    return doc;
  }
}

export interface ActionStepConf {
  name: string;
  actionSpecifier: ActionSpecifier;
  params: Record<string, any>;
  env?: Record<string, string>;
  id?: string;
  condition?: IfCondition;
  continueOnError?: boolean | string;
  timeoutMinutes?: number;
  /**
   * Trailing comment on the `uses:` line, e.g. `v5.0.0`.
   * Lets Dependabot and Renovate resolve a SHA-pinned action to a version.
   */
  versionComment?: string;
}

type PublicActionSpecifierVersioned = `${string}/${string}@v${number}`;
type PublicActionSpecifierAtCommit = `${string}/${string}@${string}`;
type PublicActionSpecifier = PublicActionSpecifierVersioned | PublicActionSpecifierAtCommit;
type InternalActionSpecifier = `./.github/actions/${string}`;
type ActionSpecifier = PublicActionSpecifier | InternalActionSpecifier;

export class ActionStep extends WorkflowComponent {
  private name: string;
  private actionSpecifier: ActionSpecifier;
  private params: Record<string, any>;
  private env: Record<string, string> | undefined;
  public readonly id: string | undefined;
  private condition: IfCondition | undefined;
  private continueOnError: boolean | string | undefined;
  private timeoutMinutes: number | undefined;
  private versionComment: string | undefined;

  constructor(conf: ActionStepConf) {
    super();
    const { name, actionSpecifier, params, env, id, condition, continueOnError, timeoutMinutes, versionComment } = conf;
    this.name = name;
    this.actionSpecifier = actionSpecifier;
    this.params = params;
    this.env = env;
    this.id = toStepId(id);
    this.condition = condition;
    this.continueOnError = continueOnError;
    this.timeoutMinutes = timeoutMinutes;
    this.versionComment = versionComment;
  }
  public toYaml(): YAML.Document {
    const doc = new YAML.Document({
      'name': this.name,
      'id': this.id,
      'if': this.condition?.toYaml(),
      'uses': this.actionSpecifier,
      'env': undefinedIfEmpty(this.env),
      'continue-on-error': this.continueOnError,
      'timeout-minutes': this.timeoutMinutes,
      'with': undefinedIfEmpty(this.params),
    });
    if (this.versionComment !== undefined) {
      const usesNode = doc.get('uses', true);
      if (YAML.isScalar(usesNode)) {
        usesNode.comment = ` ${this.versionComment}`;
      }
    }
    return doc;
  }
}

export type StepUnion = ActionStep | BashStep;

/**
 * Reference to another step's output, e.g. `steps.verify.outputs.diff`.
 * GitHub can only address a step's outputs through its id, so the step must have one.
 */
export function stepOutput(step: StepUnion, outputKey: string): string {
  if (!step.id) {
    throw new Error(`Cannot reference output '${outputKey}' of a step with no id`);
  }
  return `steps.${step.id}.outputs.${outputKey}`;
}
