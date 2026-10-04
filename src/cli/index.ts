#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from './config.ts';
import { generate } from './generate.ts';
import { init } from './init.ts';

await yargs(hideBin(process.argv))
  .scriptName('cgha')
  .command({
    command: 'generate',
    describe: 'Generate workflow files from codegen-gha.yaml',
    handler: () => generate(loadConfig(process.cwd())),
  })
  .command({
    command: 'init',
    describe: 'Set up codegen-gha.yaml and an example workflow',
    handler: () => init(),
  })
  .demandCommand(1)
  .strict()
  .fail((msg, err) => {
    console.error(err instanceof Error ? `Error: ${err.message}` : msg);
    process.exit(1);
  })
  .parseAsync();
