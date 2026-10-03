import { continuousIntegration } from './continuousIntegration.ts';
import { nonEcrDeploys } from './nonEcrDeploys.ts';

export const workflows = [continuousIntegration, nonEcrDeploys];
