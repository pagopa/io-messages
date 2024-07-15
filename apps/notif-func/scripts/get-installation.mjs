import { nhClient } from "./nh-client.mjs";

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const installationid = await rl.question("installation id: ");

rl.close();

const installation = await nhClient.getInstallation(installationid);
console.log(installation);
