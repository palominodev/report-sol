import { createHash, randomBytes } from 'node:crypto';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';

const TOKEN_BYTES = 32;

export class CryptoSessionTokenService implements ISessionTokenService {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
