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

export const DEFAULT_CONFIG: CodegenGhaConfig = {
  include: ['workflows/*.ts'],
  outDir: '.github/workflows',
  suffix: '.gen.yaml',
  commentHeader: 'DO NOT MODIFY. this file is generated using the `cgha generate` command\ngenerated from [{file}]',
};

export function loadConfig(cwd: string): CodegenGhaConfig {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    console.warn(`Could not find ${CONFIG_FILENAME} in ${cwd}; using defaults (include: ${DEFAULT_CONFIG.include.join(', ')})`);
    return { ...DEFAULT_CONFIG, include: [...DEFAULT_CONFIG.include] };
  }

  const raw = YAML.parse(fs.readFileSync(configPath, 'utf8')) ?? {};

  if (!raw.include) {
    throw new Error(`${CONFIG_FILENAME} must specify "include" with a glob of workflow files to generate`);
  }

  const include = Array.isArray(raw.include) ? raw.include : [raw.include];

  return {
    include,
    suffix: raw.suffix ?? DEFAULT_CONFIG.suffix,
    outDir: raw.outDir ?? DEFAULT_CONFIG.outDir,
    commentHeader: raw.commentHeader ?? DEFAULT_CONFIG.commentHeader,
  };
}
