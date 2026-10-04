import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'glob';
import { tsImport } from 'tsx/esm/api';
import { CodegenGhaConfig } from './config.ts';
import { Workflow, WORKFLOW_TAG } from '../components/workflow.ts';

function isWorkflow(value: unknown): value is Workflow {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[WORKFLOW_TAG] === true;
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

function importWorkflowModule(absPath: string): Promise<Record<string, unknown>> {
  // Raw paths break import() (e.g. `#` is parsed as a URL fragment); encode as a file:// URL.
  const url = pathToFileURL(absPath).href;
  if (absPath.endsWith('.ts') || absPath.endsWith('.tsx')) {
    return tsImport(url, import.meta.url);
  }
  return import(url);
}

export async function generate(config: CodegenGhaConfig, cwd: string = process.cwd()): Promise<void> {
  const outDir = path.resolve(cwd, config.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const files = await glob(config.include, { cwd, absolute: true, nodir: true });

  if (files.length === 0) {
    console.warn(`No files matched include pattern(s): ${config.include.join(', ')}`);
    return;
  }

  // first extract all the file paths and exports from the files in the passed in directory
  const modules = await Promise.all(
    files.map(async (absFile) => ({
      relFile: path.relative(cwd, absFile),
      exports: await importWorkflowModule(absFile),
    })),
  );

  // ensure that the exports we try to generate are ACTUALLY a `Workflow`
  const exportedWorkflows = modules.flatMap(({ relFile, exports }) =>
    Object.values(exports).filter(isWorkflow).map((workflow) => ({ relFile, workflow })),
  );

  for (const { relFile, workflow } of exportedWorkflows) {
    const filename = `${slugify(workflow.getName())}${config.suffix}`;
    const outPath = path.join(outDir, filename);
    const header = config.commentHeader.replace('{file}', relFile);

    fs.writeFileSync(outPath, workflow.serialize(header));
  }

  console.log(`Finished writing to ${outDir}`);
}
