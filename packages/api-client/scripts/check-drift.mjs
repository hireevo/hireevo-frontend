// Regenerates the client from the pinned spec and fails if the result differs
// from what is committed.
//
// This is the check that makes "never hand-edit the client" enforceable rather
// than a request. Without it, the quickest way past a type error is to widen a
// type here — and the frontend then compiles against a shape the API does not
// return. The only way to change a response shape is to change the backend
// contract, publish a new spec, and re-pin it.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const generated = join(root, 'src', 'schema.d.ts');

// The `.bin` entry is a shell shim, so the generator's own JS entry point is
// resolved from its manifest instead — that runs the same way on every platform.
const require = createRequire(import.meta.url);
const manifestPath = require.resolve('openapi-typescript/package.json', { paths: [root] });
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const binField = manifest.bin;
const binEntry = typeof binField === 'string' ? binField : binField['openapi-typescript'];
const generator = join(dirname(manifestPath), binEntry);

const before = readFileSync(generated, 'utf8');
execFileSync('node', [generator, './openapi.json', '-o', './src/schema.d.ts'], {
  cwd: root,
  stdio: 'pipe',
});
const after = readFileSync(generated, 'utf8');

if (before !== after) {
  console.error(
    'src/schema.d.ts does not match what openapi.json generates.\n' +
      'Run `pnpm --filter @hireevo/api-client generate` and commit the result.\n' +
      'If you edited the file by hand: the shape of a response is the backend’s to\n' +
      'change. Change the contract there, publish the spec, re-pin it here.',
  );
  process.exit(1);
}

console.log('api-client: generated client matches the pinned spec');
