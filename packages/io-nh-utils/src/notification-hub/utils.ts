import crypto from "node:crypto";

export const parseConnectionString = (connStr: string) => {
  const parts = connStr.split(";").filter(Boolean);
  const map = Object.fromEntries(
    parts.map((p) => {
      const [key, ...rest] = p.split("=");
      return [key, rest.join("=")];
    }),
  );

  const endpoint = map.Endpoint?.replace(/^sb:\/\//, "").replace(/\/$/, "");
  const namespace = endpoint?.split(".")[0];

  return {
    key: map.SharedAccessKey,
    keyName: map.SharedAccessKeyName,
    namespace,
  };
};

export const buildSasToken = (
  resourceUri: string,
  keyName: string,
  key: string,
  ttlSeconds = 3600,
) => {
  const se = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sr = encodeURIComponent(resourceUri.toLowerCase());
  const stringToSign = `${sr}\n${se}`;
  const sig = encodeURIComponent(
    crypto
      .createHmac("sha256", key)
      .update(stringToSign, "utf8")
      .digest("base64"),
  );
  return `SharedAccessSignature sr=${sr}&sig=${sig}&se=${se}&skn=${encodeURIComponent(keyName)}`;
};
