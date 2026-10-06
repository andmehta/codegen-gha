import YAML from 'yaml';

import { ghaTemplateString } from './bash-string.ts';
import { Concurrency, concurrencyToYaml, undefinedIfEmpty } from './common.ts';
import type { IfCondition } from './if-condition.ts';
import { Service } from './service.ts';
import { StepUnion } from './step.ts';
import { WorkflowComponent } from './workflow-component.ts';

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

export type RawMatrix = Record<string, Scalar[]>;
export interface ReferenceMatrix {
  expression: string;
}

export type Matrix = RawMatrix | ReferenceMatrix;

export interface MatrixStrategy {
  failFast: boolean;
  matrix: Matrix;
}

function isReferenceMatrix(matrix: Matrix): matrix is ReferenceMatrix {
  return typeof (matrix as ReferenceMatrix).expression === 'string';
}

export interface NormalJobConf {
  name: string;
  needs?: string[];
  services?: Record<string, Service>;
  steps: StepUnion[];
  runsOn: RunsOnSpecifier;
  condition?: IfCondition;
  strategy?: MatrixStrategy;
  timeoutMinutes?: number;
  env?: Record<string, string>;
  concurrency?: Concurrency;
  continueOnError?: boolean | string;
}

export class NormalJob extends WorkflowComponent {
  private name: string;
  private needs: string[];
  private services: Record<string, Service>;
  private steps: StepUnion[];
  private runsOn: RunsOnSpecifier;
  private condition: IfCondition | undefined;
  private strategy: MatrixStrategy | undefined;
  private timeoutMinutes: number | undefined;
  private env: Record<string, string>;
  private concurrency: Concurrency | undefined;
  private continueOnError: boolean | string | undefined;

  constructor(conf: NormalJobConf) {
    super();
    const { services = {}, name, needs = [], steps, runsOn, condition, strategy, timeoutMinutes, env = {}, concurrency, continueOnError } = conf;
    this.name = name;
    this.needs = needs;
    this.services = services;
    this.steps = steps;
    this.runsOn = runsOn;
    this.condition = condition;
    this.strategy = strategy;
    this.timeoutMinutes = timeoutMinutes;
    this.env = env;
    this.concurrency = concurrency;
    this.continueOnError = continueOnError;
  }
  public toYaml(): YAML.Document {
    const serviceMap: Record<string, YAML.Document> = {};
    Object.entries(this.services).forEach(([sName, sDef]) => {
      serviceMap[sName] = sDef.toYaml();
    });
    const strategy = this.strategy && {
      'fail-fast': this.strategy.failFast,
      'matrix': isReferenceMatrix(this.strategy.matrix)
        ? ghaTemplateString(this.strategy.matrix.expression)
        : this.strategy.matrix,
    };
    return new YAML.Document({
      'name': this.name,
      'needs': undefinedIfEmpty(this.needs),
      'runs-on': this.runsOn,
      'timeout-minutes': this.timeoutMinutes,
      'concurrency': concurrencyToYaml(this.concurrency),
      'continue-on-error': this.continueOnError,
      'if': this.condition?.toYaml(),
      'strategy': strategy,
      'services': undefinedIfEmpty(serviceMap),
      'env': undefinedIfEmpty(this.env),
      'steps': this.steps.map(s => s.toYaml()),
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
