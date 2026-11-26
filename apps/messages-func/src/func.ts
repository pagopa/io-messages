import { app } from "@azure/functions";

import { makeInfoHandler } from "./adapters/inbound/functions/info.handler.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { makeGetInfoUseCase } from "./application/use-cases/info.use-case.js";

const appInfoReader = new PackageJsonAppInfoReader(
  new URL("../package.json", import.meta.url),
);

app.http("Info", {
  authLevel: "anonymous",
  handler: makeInfoHandler(makeGetInfoUseCase(appInfoReader)),
  methods: ["GET"],
  route: "info",
});
