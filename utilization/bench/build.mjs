// W-ENV build: bundle the bench + the K8 battery for the browser target.
// Entries resolve against THIS FILE (K7-books R3) — cwd-insensitive, like run-target-check.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: ['src/main.ts', 'src/target-verify.ts', 'src/showcase.ts', 'src/game.ts'].map((p) => join(HERE, p)),
  bundle: true,
  format: 'esm',
  outdir: join(HERE, 'dist'),
  sourcemap: false,
  logLevel: 'info',
});
