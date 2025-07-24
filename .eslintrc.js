module.exports = {
  extends: ['expo'],
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/'],
};
