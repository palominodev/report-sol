import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = 'scrypt';

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Format: `scrypt$<salt b64>$<key b64>`. Uses Node's built-in scrypt, no extra dependency. */
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(password, salt);
    return `${PREFIX}$${salt.toString('base64')}$${key.toString('base64')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== PREFIX) return false;

    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return false;

    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
  }
}
