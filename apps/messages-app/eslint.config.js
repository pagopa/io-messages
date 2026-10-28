import pagopa from "@pagopa/eslint-config";

export default [
  {
    ignores: ["coverage/**", "dist/**", "docker/**", "*.js"],
  },
  ...pagopa,
];
