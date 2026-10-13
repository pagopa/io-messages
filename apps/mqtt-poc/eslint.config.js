import pagopa from "@pagopa/eslint-config";

export default [
  { ignores: ["dist/**", "local/**", "examples/**", "*.js"] },
  ...pagopa,
  {
    files: [
      "src/{server,setup,publisher,integration,reliability,benchmark,demo}.ts",
    ],
    rules: { "no-console": "off" },
  },
];
