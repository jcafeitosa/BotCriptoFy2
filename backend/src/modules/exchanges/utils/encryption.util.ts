import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended

function getSecret(): Buffer {
  const secret = process.env.EXCHANGE_CREDENTIALS_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('EXCHANGE_CREDENTIALS_KEY must be set and at least 32 characters long');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptSecret(plainText: string): EncryptionResult {
  const key = getSecret();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSecret(payload: EncryptionResult | string): string {
  const key = getSecret();
  const parsed: EncryptionResult =
    typeof payload === 'string' ? (JSON.parse(payload) as EncryptionResult) : payload;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(parsed.iv, 'base64'),
    { authTagLength: 16 }
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function serializeEncryptedSecret(result: EncryptionResult): string {
  return JSON.stringify(result);
}

export function deserializeEncryptedSecret(serialized: string): EncryptionResult {
  return JSON.parse(serialized) as EncryptionResult;
}
