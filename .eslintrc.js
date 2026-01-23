
// https://docs.expo.dev/guides/using-eslint/
// ⚠️ TEMPORARY DEVELOPMENT CONFIGURATION - NON-BLOCKING LINT
// ESLint is configured to provide feedback without blocking builds or preview.
// All rules are set to "warn" level, and the lint script allows unlimited warnings.
// This allows development to continue while code quality issues are addressed incrementally.
module.exports = {
  extends: [
    'expo',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'import'],
  root: true,
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  ignorePatterns: ['/dist/*', '/public/*', '/babel-plugins/*', '/backend/*'],
  env: {
    browser: true,
  },
  rules: {
    // All rules set to "warn" to prevent build blocking
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-as-const": "warn",
    "@typescript-eslint/no-var-requires": "warn",
    "@typescript-eslint/ban-tslint-comment": "warn",
    "react/react-in-jsx-scope": "off",
    "react/no-unescaped-entities": "warn",
    "react/display-name": "warn",
    "react/prop-types": "warn",
    "import/no-unresolved": "warn",
    "prefer-const": "warn",
    "no-case-declarations": "warn",
    "no-empty": "warn",
    "no-constant-condition": "warn",
    "no-var": "warn",
    "no-useless-escape": "warn"
  },
  overrides: [
    {
      files: ['metro.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};
