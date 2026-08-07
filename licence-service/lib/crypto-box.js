// Reversible storage for licence keys.
//
// Keys are still hashed for lookup (lib/keys.js) - that is what activation
// checks against. This is a second, sealed copy, kept so a customer who proves
// who they are can be given their existing key back instead of having it
// rotated out from under their other machines.
//
// The sealing key lives in the environment, never in the database. A dump of
// the licence collection therefore still yields nothing usable, which is the
// property the hash-only design was protecting.

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function isConfigured() {
  return Boolean(process.env.LICENCE_KEY_SECRET);
}

function sealingKey() {
  const secret = process.env.LICENCE_KEY_SECRET;
  if (!secret) throw new Error('LICENCE_KEY_SECRET is not configured');

  // Accepts a passphrase of any length and always yields the 32 bytes AES-256
  // needs
  return crypto.createHash('sha256').update(secret).digest();
}

/** Encrypt a licence key for storage. Returns iv.tag.ciphertext, base64. */
function seal(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, sealingKey(), iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return [
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

/**
 * Decrypt a sealed licence key, or null if it cannot be read.
 *
 * Returning null rather than throwing matters: a rotated LICENCE_KEY_SECRET
 * makes every stored value unreadable, and callers should fall back to issuing
 * a new key rather than failing outright.
 */
function open(sealed) {
  if (!sealed || !isConfigured()) return null;

  try {
    const [iv, tag, encrypted] = String(sealed).split('.');
    if (!iv || !tag || !encrypted) return null;

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      sealingKey(),
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { isConfigured, seal, open };
