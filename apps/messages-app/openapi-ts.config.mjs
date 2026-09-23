/** @type {import("@hey-api/openapi-ts").UserConfig} */
export default {
  input: "api/consumed/pagopa_ecommerce.yaml",
  output: {
    importFileExtension: ".js",
    path: "src/generated/pagopa-ecommerce",
  },
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    "zod",
  ],
};
