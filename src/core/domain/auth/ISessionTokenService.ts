export interface ISessionTokenService {
  /** New unguessable token to hand to the browser. */
  generate(): string;
  /** Deterministic digest; this is the only form that is ever stored. */
  hash(token: string): string;
}
