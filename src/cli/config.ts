import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const CONFIG_FILENAME = 'codegen-gha.yaml';

export interface CodegenGhaConfig {
  include: string[];
  suffix: string;
  outDir: string;
  commentHeader: string;
}

const DEFAULTS = {
  suffix: '.gen.yaml',
  outDir: '.',
  commentHeader: 'this file is generated using cgha generate {file}',
};

export function loadConfig(cwd: string): CodegenGhaConfig {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Could not find ${CONFIG_FILENAME} in ${cwd}`);
  }

  const raw = YAML.parse(fs.readFileSync(configPath, 'utf8')) ?? {};

  if (!raw.include) {
    throw new Error(`${CONFIG_FILENAME} must specify "include" with a glob of workflow files to generate`);
  }

  const include = Array.isArray(raw.include) ? raw.include : [raw.include];

  return {
    include,
    suffix: raw.suffix ?? DEFAULTS.suffix,
    outDir: raw.outDir ?? DEFAULTS.outDir,
    commentHeader: raw.commentHeader ?? DEFAULTS.commentHeader,
  };
}
