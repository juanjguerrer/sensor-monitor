// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  { ignores: ['dist/**', 'src/generated/**', 'coverage/**'], },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['jest.setup.ts'] },
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.test.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['src/migrations/**/*.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  }
]);