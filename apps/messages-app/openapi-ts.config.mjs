/** @type {import("@hey-api/openapi-ts").UserConfig} */
export default [
  {
    input:
      "https://raw.githubusercontent.com/pagopa/io-backend/d75e74049bc2f2268881e052ecfd92391305bcbd/openapi/consumed/pagopa_ecommerce.yaml",
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
  },
  {
    input: "./api/consumed/remote-content.yaml",
    output: {
      importFileExtension: ".js",
      path: "src/generated/remote-content",
    },
    plugins: [
      "@hey-api/client-fetch",
      "@hey-api/typescript",
      "@hey-api/sdk",
      "zod",
    ],
  },
];
