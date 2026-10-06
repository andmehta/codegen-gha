import YAML from 'yaml';
import { ghaTemplateString } from './bash-string.ts';
import { jobOutput, type NormalJob } from './job.ts';
import { stepOutput, type StepUnion } from './step.ts';
import { WorkflowComponent } from './workflow-component.ts';

export interface IfConditionConf {
  expression: string;
}
export class IfCondition extends WorkflowComponent {

  static stepOutputNotNull(otherStep: StepUnion, outputKey: string) {
    const output = stepOutput(otherStep, outputKey);
    return new IfCondition({ expression: `${output} != ''` });
  }

  static jobOutputEquals(otherJob: NormalJob, outputKey: string, value: string) {
    const output = jobOutput(otherJob, outputKey);
    return new IfCondition({ expression: `${output} == '${value}'` });
  }

  static isPullRequest() {
    return new IfCondition({ expression: "github.event_name == 'pull_request'" });
  }

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

  /**
   * Combine with another expression, e.g. a status function like failure(). GitHub only adds
   * its implicit success() when the expression has no status function of its own.
   */
  and(otherCondition: IfCondition): IfCondition {
    return new IfCondition({ expression: `${this.expression} && ${otherCondition.expression}` });
  }

  /**
   * Combine with another expression, e.g. a status function like failure(). GitHub only adds
   * its implicit success() when the expression has no status function of its own.
   */
  or(otherCondition: IfCondition): IfCondition {
    return new IfCondition({ expression: `${this.expression} || ${otherCondition.expression}` });
  }
}
