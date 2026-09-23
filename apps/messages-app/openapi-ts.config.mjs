/** @type {import("@hey-api/openapi-ts").UserConfig[]} */
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
    input:
      "https://raw.githubusercontent.com/pagopa/io-auth-n-identity-domain/a72aa390991e8acaf3258ed4c55f973722d7d5ad/apps/io-lollipop/api/internal.yaml",
    output: {
      importFileExtension: ".js",
      path: "src/generated/lollipop",
    },
    plugins: [
      "@hey-api/client-fetch",
      "@hey-api/typescript",
      "@hey-api/sdk",
      "zod",
    ],
  },
];
