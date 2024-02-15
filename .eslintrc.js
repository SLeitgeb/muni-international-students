module.exports = {
  env: {
    browser: true,
    es2024: true
  },
  parserOptions: {
    sourceType: 'script'
  },
  rules: {
    strict: ['error', 'global']
  },
  extends: [
    'semistandard'
  ]
};
