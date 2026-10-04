import YAML from 'yaml';

export abstract class WorkflowComponent {
  constructor() {
    // pass
  }
  abstract toYaml(): YAML.Document;
}
