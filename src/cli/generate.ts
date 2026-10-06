import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'glob';
import type { CodegenGhaConfig } from './config.ts';
import { Workflow, WORKFLOW_TAG } from '../components/workflow.ts';

function isWorkflow(value: unknown): value is Workflow {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[WORKFLOW_TAG] === true;
}

// `.ts` workflow files load through Node's built-in type stripping, which only deletes types and
// so rejects some TypeScript. Node's own errors don't say how to fix the source; these hints do.
function typeStrippingHint(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
    return 'Workflow files can only use TypeScript that Node can strip: no enums, namespaces or constructor parameter properties.';
  }
  if (code === 'ERR_MODULE_NOT_FOUND') {
    return "Relative imports in workflow files need their file extension, e.g. '../lib/index.ts' rather than '../lib/index'.";
  }
  if (code === 'ERR_UNKNOWN_FILE_EXTENSION') {
    return `Loading .ts workflow files needs Node.js 22.18 or later (this is ${process.version}).`;
  }
  if (error instanceof SyntaxError && error.message.includes('does not provide an export named')) {
    return "Types must be imported with 'import type' (or an inline 'type' modifier), since Node deletes them before running.";
  }
  return undefined;
}

async function importWorkflowModule(absPath: string): Promise<Record<string, unknown>> {
  // Raw paths break import() (e.g. `#` is parsed as a URL fragment); encode as a file:// URL.
  const url = pathToFileURL(absPath).href;
  try {
    return await import(url);
  } catch (error) {
    const hint = typeStrippingHint(error);
    if (!hint) {
      throw error;
    }
    throw new Error(`Failed to load ${absPath}: ${(error as Error).message}\n${hint}`, { cause: error });
  }
}

export async function generate(config: CodegenGhaConfig, cwd: string = process.cwd()): Promise<void> {
  const outDir = path.resolve(cwd, config.outDir);
  const existingFiles = await glob(path.join(outDir, `*${config.suffix}`), { cwd: outDir, absolute: true, nodir: true });
  await Promise.all(existingFiles.map((file) => fs.promises.rm(file)));
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
    const filename = `${workflow.getName()}${config.suffix}`;
    const outPath = path.join(outDir, filename);
    const header = config.commentHeader.replace('{file}', relFile);

    fs.writeFileSync(outPath, workflow.serialize(header));
  }

  console.log(`Finished writing to ${outDir}`);
}
