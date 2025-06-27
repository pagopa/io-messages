const fs = require("node:fs");
const filepath = require.resolve(
  "@pagopa/io-functions-commons/openapi/definitions.yaml",
);
// Copy the content of the file stored in filepath to a new file
fs.copyFileSync(filepath, "openapi/commons-definitions.yaml");
