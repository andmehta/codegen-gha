import YAML from 'yaml';

import { BashString } from './bashString.ts';
import { undefinedIfEmpty, WorkflowComponent } from './common.ts';

export interface BashStepConf {
  name: string;
  run: BashString;
}
export class BashStep extends WorkflowComponent {
  private name: string;
  private run: BashString;
  constructor(conf: BashStepConf) {
    super();
    const { name, run } = conf;
    this.name = name;
    this.run = run;
  }
  toYaml(): YAML.Document {
    const doc = new YAML.Document({
      name: this.name,
      shell: 'bash',
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

  constructor(conf: ActionStepConf) {
    super();
    const { name, actionSpecifier, params, env } = conf;
    this.name = name;
    this.actionSpecifier = actionSpecifier;
    this.params = params;
    this.env = env;
  }
  public toYaml(): YAML.Document {
    return new YAML.Document({
      name: this.name,
      uses: this.actionSpecifier,
      env: undefinedIfEmpty(this.env),
      with: undefinedIfEmpty(this.params),
    });
  }
}

export type StepUnion = ActionStep | BashStep;
