import YAML from 'yaml';

import { EnvConf } from './common.ts';
import { NormalJob } from './job.ts';

export type InputType = 'string' | 'boolean' | 'number';

export interface Input<T> {
  type: InputType;
  required: boolean;
  default?: T;
}
interface WorkflowTriggerNarrowers {
  paths?: string[];
  branches?: string[];
}
interface Schedule {
  cron: string;
}
interface Secret {
  required: boolean;
}
interface WorkflowCall {
  inputs: Record<string, Input<any>>;
  secrets: Record<string, Secret>;
}

interface WorkflowTrigger {
  merge_queue?: WorkflowTriggerNarrowers | null;
  pull_request?: WorkflowTriggerNarrowers | null;
  merge_group?: WorkflowTriggerNarrowers | null;
  push?: WorkflowTriggerNarrowers | null;
  workflow_dispatch?: WorkflowCall | null;
  workflow_call?: WorkflowCall;
  schedule?: Schedule;
}

export interface WorkflowConf {
  name: string;
  trigger: WorkflowTrigger;
  jobs: Record<string, NormalJob>;
  env: EnvConf;
  // inputs: Record<string, Input<any>>;
  permissions: Permissions;
}

type ReadOrWrite = 'read' | 'write';

interface Permissions {
  // OIDC tokens have no read-only mode, so GitHub only accepts 'write' or 'none' here
  'id-token': 'write' | 'none';
  'contents': ReadOrWrite;
  'pull-requests': ReadOrWrite;
  'checks': ReadOrWrite;
  'actions': ReadOrWrite;
}

// A loader that dynamically imports a workflow file (e.g. the CLI's tsx-based loader) may end
// up executing it in a separate module realm, where `instanceof Workflow` would fail even though
// the instance is a "real" Workflow. Symbol.for() is keyed off Node's process-wide symbol
// registry, so it stays identical across realms and lets callers detect Workflow instances safely.
export const WORKFLOW_TAG = Symbol.for('codegen-gha.Workflow');

export class Workflow {
  public readonly [WORKFLOW_TAG] = true;

  private name: string;
  private trigger: WorkflowTrigger;
  private jobs: Record<string, NormalJob>;
  private env: EnvConf;
  private permissions: Permissions;

  constructor(conf: WorkflowConf) {
    const { name, trigger, jobs, env, permissions } = conf;

    this.name = name;
    this.trigger = trigger;
    this.jobs = jobs;
    this.env = env;
    this.permissions = permissions;
  }

  public serialize(header?: string): string {
    const jobMap: Record<string, YAML.Document> = {};
    Object.entries(this.jobs).forEach(([jName, jDef]) => {
      jobMap[jName] = jDef.toYaml();
    });
    const doc = new YAML.Document(
      {
        name: this.name,
        on: this.trigger,
        permissions: this.permissions,
        env: this.env,
        jobs: jobMap,
      },
    );

    // if we pass a header, make sure its a proper comment
    // if someone uses \n in the string, we have to essentially recreate that here
    const commentHeader = header
      ? header.split('\n').map(line => `# ${line}`).join('\n') + '\n'
      : '';

    const contents = commentHeader + doc.toString({
      lineWidth: 0,
      doubleQuotedMinMultiLineLength: 0,
      singleQuote: true,
      nullStr: '',
    });

    return contents;
  }
  /**
   *
   * @returns slugified name parameter
   */
  public getName() {
    return this.name.toLowerCase().trim().replace(/\s+/g, '-');
  }
}
