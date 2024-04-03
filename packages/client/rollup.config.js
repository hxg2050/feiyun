import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
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
    external: ['eventemitter3'],
    plugins: [typescript(), commonjs(), nodeResolve()],
})
