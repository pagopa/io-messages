import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export const outputPath = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}.csv`;
  if (!fs.existsSync(path.resolve(process.cwd(), "data"))) {
    fs.mkdirSync(path.resolve(process.cwd(), "data"), { recursive: true });
  }
  const outputPath = path.resolve(process.cwd(), "data", fileName);
  return outputPath;
};

export const parseEnvVariable = (envVar: string, optional = false) => {
  const value = process.env[envVar];

  if (!value && !optional) throw new Error(`${envVar} is not set`);

  return value;
};
