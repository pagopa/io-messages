export const readableStreamToUtf8 = async (
  readable: NodeJS.ReadableStream,
): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readable.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf-8")),
    );
    readable.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    readable.on("error", (err) => {
      reject(err);
    });
  });
