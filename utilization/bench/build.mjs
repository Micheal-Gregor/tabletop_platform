// W-ENV build: bundle the bench + the K8 battery for the browser target.
import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.ts', 'src/target-verify.ts', 'src/showcase.ts', 'src/game.ts'],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  sourcemap: false,
  logLevel: 'info',
});
