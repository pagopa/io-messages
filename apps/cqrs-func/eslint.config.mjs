import pagopa from "@pagopa/eslint-config";

export default [
  {
    ignores: [
      "dist/**",
      "docker/**",
      "generated/**",
      "**/__mocks__/**",
      "**/__tests__/**",
      "*.js",
    ],
  },
  ...pagopa,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
