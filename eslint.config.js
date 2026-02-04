import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
    // Global ignores
    {
        ignores: ['dist/**', 'node_modules/**', 'eslint.config.js', 'commitlint.config.js'],
    },

    // TypeScript & Prettier Configuration
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
            // Globals would go here but we lack the package, so we rely on environment/builtin
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            prettier: prettierPlugin,
        },
        rules: {
            // Replicating recommended rules manually since we can't extend legacy configs easily in flat config without compat utils

            // Prettier
            'prettier/prettier': 'error',

            // TypeScript (High Priority)
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/no-empty-interface': 'warn',

            // General
            'no-console': 'off',
            'no-debugger': 'error',
        },
    },
];
