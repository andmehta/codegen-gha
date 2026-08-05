import YAML from 'yaml';

import { WorkflowComponent, EnvConf } from './common';

export interface ServiceConf {
  image: string;
  env: EnvConf;
  ports: Record<number, number>;
  options: string[];
}

export class Service extends WorkflowComponent {
  private image: string;
  private env: EnvConf;
  private ports: Record<number, number>;
  private options: string[];

  constructor(conf: ServiceConf) {
    super();
    const { image, env, ports, options } = conf;
    this.image = image;
    this.env = env;
    this.ports = ports;
    this.options = options;
  }

  public toYaml(): YAML.Document {
    const node = new YAML.Document({
      image: this.image,
      env: this.env,
      ports: Object.entries(this.ports).map(([from, to]) => `${from}:${to}`),
      options: this.options.join(' '),
    });

    return node;
  }
}
