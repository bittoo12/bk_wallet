import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = crypto.randomBytes(32); // 32 bytes for AES-256
const IV = crypto.randomBytes(16);
const algorithm = 'aes-256-gcm';
const iv_length = 12; // For GCM

const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

if (!key || key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
}

export const encrypt = (text) => {
  const iv = crypto.randomBytes(iv_length);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const passwordEncrypt = (text) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedData: encrypted,
    key: ENCRYPTION_KEY.toString('hex'),
    iv: IV.toString('hex')
  };
};

export const decrypt = (encryptedBase64) => {
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, iv_length);
  const authTag = data.subarray(iv_length, iv_length + 16);
  const encrypted = data.subarray(iv_length + 16);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

export const decryptPassword = (encryptedData, keyHex, ivHex) => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
