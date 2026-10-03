import { ci } from './ci.ts';
import { verifyGeneration } from './verify-generation/index.ts';

export const workflows = [ci, verifyGeneration];
