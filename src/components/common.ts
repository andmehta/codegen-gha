import YAML from 'yaml';
import { ghaTemplateString } from './bashString';

export abstract class WorkflowComponent {
  abstract toYaml(): YAML.Document;
  constructor() {
    // pass
  }
}

export type EnvConf = Record<string, string>;

export type InputType = 'string' | 'boolean' | 'number';

export interface Input<T> {
  type: InputType;
  required: boolean;
  default?: T;
}

export interface IfConditionConf {
  expression: string;
}
export class IfCondition extends WorkflowComponent {
  private readonly expression: string;

  constructor(conf: IfConditionConf) {
    super();
    const { expression } = conf;
    this.expression = expression;
  }
  toYaml(): YAML.Document {
    const expr = ghaTemplateString(this.expression);
    return new YAML.Document(expr);
  }
}

export interface IfConditionPlanConf {
  planKey: string;
}
export class IfConditionPlan extends IfCondition {
  constructor(conf: IfConditionPlanConf) {
    const { planKey } = conf;
    const expression = `fromJSON(inputs.plan).${planKey} || false`;
    super({ expression });
  }
}

// interface BaseStep {
//   name: string;
// }

// interface InternalActionCallingStep extends BaseStep {
//   actionPath: string;
// }
// interface PublicActionCallingStep extends BaseStep {
//   actionSpecifier: string;
// }
// type Script = string;
// interface BashStepThing extends BaseStep {
//   run: Script;
// }

// type StepUnion = InternalActionCallingStep | PublicActionCallingStep | BashStepThing;

// interface OutputRef {
//   id: string;
//   source: StepUnion;
// }

// interface WorkflowCallingJob extends BaseJob {
//   workflowPath: string;
// }

// type JobUnion = NormalJob | WorkflowCallingJob;

/**
 * Util for getting undefined if an object or array is empty
 * to avoid having extra noise in the generated yaml
 */
export function undefinedIfEmpty<T extends Record<string, any> | any[] | undefined>(
  thing: T,
): T | undefined {
  if (typeof thing === 'undefined') return undefined;
  if (Array.isArray(thing) && thing.length > 0) return thing;
  if (Object.keys(thing).length > 0) return thing;
  return undefined;
}
