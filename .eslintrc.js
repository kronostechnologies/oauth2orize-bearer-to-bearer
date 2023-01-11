module.exports = {
    root: true,
    extends: [
        '@equisoft/eslint-config',
    ],
    plugins: [
        'import',
        'mocha',
        'chai-friendly',
    ],
    env: {
        mocha: true,
    },
    ignorePatterns: [
        'node_modules',
        'coverage',
    ],
    rules: {
    },
    settings: {
    },
    overrides: [
    ],
};
