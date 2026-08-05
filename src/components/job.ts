import YAML from 'yaml';

import { WorkflowComponent, IfCondition, undefinedIfEmpty } from './common';
import { StepUnion } from './step';
import { Service } from './service';

const RUNS_ON_SPECIFIERS = [
  'ubuntu-latest',
  'depot-ubuntu-24.04-small',
  'depot-ubuntu-24.04',
  'depot-ubuntu-24.04-4',
  'depot-ubuntu-24.04-8',
  'depot-ubuntu-24.04-16',
  'depot-macos-14',
  ['self-hosted', 'linux', 'x64', 'docker-hot-cache'],
  ['self-hosted', 'linux', 'x64', 'lattice-8core-general'],
  ['self-hosted', 'linux', 'x64', 'lattice-2core-compute'],
  // TODO:
  // ${{ fromJSON(inputs.weaver-jest-runner) }}
] as const;

type RunsOnSpecifier = (typeof RUNS_ON_SPECIFIERS)[number];

export const RUNS_ON: Record<string, RunsOnSpecifier> = {
  GITHUB_LATEST: 'ubuntu-latest',
  DEPOT_SMALL: 'depot-ubuntu-24.04-small',
  DEPOT_REGULAR: 'depot-ubuntu-24.04',
  DEPOT_FOUR: 'depot-ubuntu-24.04-4',
  DEPOT_EIGHT: 'depot-ubuntu-24.04-8',
  DEPOT_SIXTEEN: 'depot-ubuntu-24.04-16',
  DEPOT_MACOS: 'depot-macos-14',
  SELF_HOSTED_TWO: ['self-hosted', 'linux', 'x64', 'lattice-2core-compute'],
  SELF_HOSTED_EIGHT: ['self-hosted', 'linux', 'x64', 'lattice-8core-general'],
  SELF_HOSTED_DOCKER_POOL: ['self-hosted', 'linux', 'x64', 'docker-hot-cache'],
} as const;

type Scalar = string | number | boolean;

type RawMatrix = Record<string, Scalar[]>;
interface ReferenceMatrix {
  expression: string;
}

type Matrix = RawMatrix | ReferenceMatrix;

interface MatrixStrategy {
  failFast: boolean;
  matrix: Matrix;
}

export interface NormalJobConf {
  name: string;
  needs: string[];
  services: Record<string, Service>;
  steps: StepUnion[];
  runsOn: RunsOnSpecifier;
  condition: IfCondition;
  strategy?: MatrixStrategy;
  timeoutMinutes: number;
  env: Record<string, string>;
}

export class NormalJob extends WorkflowComponent {
  private name: string;
  private needs: string[];
  private services: Record<string, Service>;
  private steps: StepUnion[];
  private runsOn: RunsOnSpecifier;
  private condition: IfCondition;
  private timeoutMinutes: number;
  private env: Record<string, string>;

  constructor(conf: NormalJobConf) {
    super();
    const { services, name, needs, steps, runsOn, condition, timeoutMinutes, env } = conf;
    this.name = name;
    this.needs = needs;
    this.services = services;
    this.steps = steps;
    this.runsOn = runsOn;
    this.condition = condition;
    this.timeoutMinutes = timeoutMinutes;
    this.env = env;
  }
  public toYaml(): YAML.Document {
    const serviceMap: Record<string, YAML.Document> = {};
    Object.entries(this.services).forEach(([sName, sDef]) => {
      serviceMap[sName] = sDef.toYaml();
    });
    return new YAML.Document({
      name: this.name,
      needs: undefinedIfEmpty(this.needs),
      'runs-on': this.runsOn,
      'timeout-minutes': this.timeoutMinutes,
      if: this.condition.toYaml(),
      services: undefinedIfEmpty(serviceMap),
      env: undefinedIfEmpty(this.env),
      steps: this.steps.map(s => s.toYaml()),
    });
  }
}

type WorkflowSpecifier = `./.github/workflows/${string}`;

interface WorkflowCallConf {
  name: string;
  needs: string[];
  workflowSpecifier: WorkflowSpecifier;
  params: Record<string, any>;
  condition: IfCondition;
}

export class WorkflowCallJob extends WorkflowComponent {
  private name: string;
  private workflowSpecifier: WorkflowSpecifier;
  private params: Record<string, any>;
  private condition: IfCondition;
  private needs: string[];

  constructor(conf: WorkflowCallConf) {
    super();
    const { name, needs, condition, workflowSpecifier, params } = conf;
    this.name = name;
    this.needs = needs;
    this.workflowSpecifier = workflowSpecifier;
    this.condition = condition;
    this.params = params;
  }
  public override toYaml(): YAML.Document {
    return new YAML.Document({
      name: this.name,
      // We so far don't have a use case for any other config setting for secrets
      secrets: 'inherit',
      if: this.condition.toYaml(),
      needs: undefinedIfEmpty(this.needs),
      uses: this.workflowSpecifier,
      with: undefinedIfEmpty(this.params),
    });
  }
}
