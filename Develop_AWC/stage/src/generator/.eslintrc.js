module.exports = {
    extends: '../build/.eslintrc.js',
    rules: {
        'dot-notation': 1,
        'max-nested-callbacks': [ 'error', 7 ],
        'no-else-return': 1,
        'no-trailing-spaces': 1,
        'padded-blocks': [ 'warn', 'never' ],
        'quotes': [ 'warn', 'single' ],
        'space-in-parens': [ 'warn', 'always' ],
        'spaced-comment': [ 'warn', 'always' ],
    },
    globals: {},
    env: {
        browser: false,
        node: true,
        es6: true
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
            generators: true,
            experimentalObjectRestSpread: true
        }
    }
};
