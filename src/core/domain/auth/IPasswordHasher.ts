export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  /** Never throws on a malformed stored hash; it simply does not match. */
  verify(password: string, storedHash: string): Promise<boolean>;
}
