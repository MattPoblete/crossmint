import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'wallet/index': 'src/wallet/index.ts',
    'dex/index': 'src/dex/index.ts',
    'yield/index': 'src/yield/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['@stellar/stellar-sdk', '@soroswap/sdk', '@defindex/defindex-sdk'],
});
