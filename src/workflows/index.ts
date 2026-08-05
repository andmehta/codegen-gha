import { continuousIntegration } from './continuousIntegration';
import { nonEcrDeploys } from './nonEcrDeploys';

export const workflows = [continuousIntegration, nonEcrDeploys];
