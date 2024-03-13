import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

import { defineConfig } from 'rollup';
export default defineConfig([{
    input: 'src/index.ts',
    output: [{
        file: 'dist/index.cjs',
        format: 'cjs'
    }, {
        file: 'dist/index.mjs',
        format: 'esm'
    }],
    plugins: [typescript({
        compilerOptions: {
            outDir: "./dist",
            declaration: false,
            declarationDir: undefined
        }
    })]
}, {
    input: 'class-transformer/index.ts',
    output: [{
        file: 'class-transformer/dist/index.cjs',
        format: 'cjs'
    }, {
        file: 'class-transformer/dist/index.mjs',
        format: 'esm'
    }],
    plugins: [typescript({
        compilerOptions: {
            outDir: "./class-validator/dist",
            declaration: false,
            declarationDir: undefined
        }
    })]
}, {
    input: 'class-validator/index.ts',
    output: [{
        file: 'class-validator/dist/index.cjs',
        format: 'cjs'
    }, {
        file: 'class-validator/dist/index.mjs',
        format: 'esm'
    }],
    plugins: [typescript({
        compilerOptions: {
            outDir: "./class-validator/dist",
            declaration: false,
            declarationDir: undefined
        }
    })]
}]);