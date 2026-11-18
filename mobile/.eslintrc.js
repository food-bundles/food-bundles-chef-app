module.exports = {
  extends: ['expo', 'plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    'react-hooks/exhaustive-deps': 'warn',
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "JSXOpeningElement[name.name='Pressable'] > JSXAttribute[name.name='style'] > JSXExpressionContainer > :matches(ArrowFunctionExpression, FunctionExpression)",
        message:
          'NativeWind drops function styles on Pressable. Use AppPressable from @/components/ui/AppPressable.',
      },
    ],
  },
  overrides: [
    {
      // Node-side config, Expo config plugins and build scripts: plain JavaScript outside the
      // app's tsconfig, so they are linted without type information.
      files: ['*.js', '*.mjs', 'plugins/**/*.js', 'scripts/**/*.js', 'scripts/**/*.mjs'],
      parserOptions: { project: null },
      env: { node: true },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'coverage/', 'metro.config.js', 'babel.config.js', 'tailwind.config.js', 'jest.config.js'],
};
