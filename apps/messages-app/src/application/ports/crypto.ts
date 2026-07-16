export interface CryptoRepository {
  /**
   * Hashes the given string.
   * @param s The string to hash.
   */
  toSha256(s: string): string;
}
