import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

export default defineConfig({
  input: 'src/index.ts',
  output: [{
    file: 'dist/index.cjs',
    format: 'cjs',
  }, {
    file: 'dist/index.mjs',
    format: 'esm',
  }],
  plugins: [typescript()],
})
