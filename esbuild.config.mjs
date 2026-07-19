import esbuild from 'esbuild';
import process from 'process';

const production = process.argv[2] === 'production';
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian'],
  format: 'cjs',
  target: 'es2022',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  minify: production,
  outfile: 'main.js'
};
if (production) await esbuild.build(options); else (await esbuild.context(options)).watch();
