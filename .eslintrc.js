module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint'
  },
  env: {
    browser: true
  },
  extends: [
    'standard'
  ],
  rules: {
    'brace-style': ['error', 'stroustrup'],
    'padded-blocks': ['error', { classes: 'always' }]
  }
}
