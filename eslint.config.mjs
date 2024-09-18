/* eslint-disable n/no-unpublished-import */
import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import nodePlugin from 'eslint-plugin-n'

export default [
  { plugins: { n: nodePlugin } },
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'n/no-unsupported-features/es-syntax': [
        'error',
        {
          ignores: ['modules'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'n/no-unpublished-import': [
        'error',
        {
          allowModules: ['onecore-types'],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'n/no-unpublished-import': 0,
    },
  },
]

// export default [
// ...fixupConfigRules(
// compat.extends(
// 'eslint:recommended',
// 'plugin:@typescript-eslint/recommended',
// 'prettier',
// 'plugin:node/recommended'
// )
// ),
// {
// plugins: {
// '@typescript-eslint': fixupPluginRules(typescriptEslint),
// node: fixupPluginRules(node),
// },
// languageOptions: {
// globals: {
// ...globals.node,
// },
// parser: tsParser,
// ecmaVersion: 2020,
// sourceType: 'commonjs',
// parserOptions: {
// project: '**/tsconfig.json',
// },
// },
// settings: {
// node: {
// tryExtensions: ['.js', '.ts'],
// },
// },
// rules: {
// '@typescript-eslint/no-explicit-any': 'warn',
// 'node/no-unsupported-features/es-syntax': [
// 'error',
// {
// ignores: ['modules'],
// },
// ],
// '@typescript-eslint/no-unused-vars': [
// 'warn',
// {
// argsIgnorePattern: '^_',
// varsIgnorePattern: '^_',
// caughtErrorsIgnorePattern: '^_',
// },
// ],
// 'node/no-unpublished-import': [
// 'error',
// {
// allowModules: ['onecore-types'],
// },
// ],
// },
// },
// {
// files: ['src/**/*.test.ts'],
// rules: {
// 'node/no-unpublished-import': 0,
// },
// },
// ]

