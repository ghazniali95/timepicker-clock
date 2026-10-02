import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // Dual package: CJS (dist/index.js) for `require`, ESM (dist/index.mjs) for
  // `import`, plus generated .d.ts types.
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  // React is the consumer's, not ours — never bundle it.
  external: ['react', 'react-dom'],
});
