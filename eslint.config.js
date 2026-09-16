// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/*'],
  },
  {
    rules: {
      // Le code métier sensible est côté serveur ; côté mobile, un any implicite
      // masquerait surtout une désynchronisation avec les types générés.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
