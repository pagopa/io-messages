import * as crypto from "crypto";

import type { CryptoRepository } from "../../../application/ports/crypto.js";

export class CryptoAdapter implements CryptoRepository {
  toSha256(s: string): string {
    return crypto.createHash("sha256").update(s).digest("hex");
  }
}
