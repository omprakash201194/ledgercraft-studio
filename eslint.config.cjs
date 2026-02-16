const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
    {
        files: ["**/*.ts", "**/*.tsx"],
        ...js.configs.recommended,
        ...tseslint.configs.recommended,
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "no-console": ["warn", { "allow": ["warn", "error"] }],
            "@typescript-eslint/no-explicit-any": "warn"
        },
    }
];
