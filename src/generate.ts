import path from 'node:path';
import fs from 'node:fs';
import { workflows } from './workflows';

const OUTPUT_DIR = path.join(__dirname, '..', 'generated-workflows');

async function generate(): Promise<void> {
  console.log(`cleaning output dir ${OUTPUT_DIR}`);
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  workflows.forEach(w => {
    const filename = w.getName().toLowerCase().replace(' ', '-');
    const outpath = path.join(OUTPUT_DIR, `${filename}.yml`);

    console.log(`Writing ${w.getName()} to ${outpath}`);
    fs.writeFileSync(outpath, w.serialize());
  });
}

generate()
  .then(() => {
    console.log('all done');
    process.exit(0);
  })
  .catch(e => {
    console.error('something went wrong', e);
    process.exit(1);
  });
