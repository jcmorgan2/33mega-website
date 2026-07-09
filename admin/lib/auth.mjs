/**
 * Authentication for the admin web app — no database, no external deps.
 *
 * - Passwords stored as scrypt hashes (per-user random salt), never plaintext.
 * - Sessions are stateless HS256 JWTs signed with a server secret (fits Cloud Run).
 * Both primitives use Node's built-in crypto only.
 */
import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/** Hash a plaintext password → "scrypt$<saltHex>$<hashHex>". */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** Constant-time verify against a stored "scrypt$salt$hash" string. */
export function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, SCRYPT_PARAMS);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlJSON = (obj) => b64url(JSON.stringify(obj));

/** Sign a stateless JWT (HS256). ttlSeconds default 12h. */
export function signToken(payload, secret, ttlSeconds = 43200) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = b64urlJSON({ alg: 'HS256', typ: 'JWT' });
  const claims = b64urlJSON(body);
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest());
  return `${header}.${claims}.${sig}`;
}

/** Verify a JWT; returns the payload or null (bad signature / expired / malformed). */
export function verifyToken(token, secret) {
  try {
    const [header, claims, sig] = String(token).split('.');
    if (!header || !claims || !sig) return null;
    const expected = b64url(crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(claims.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Load the admin user table from the ADMIN_USERS env var (JSON:
 * { "jonathan@33mega.cloud": "scrypt$..." , ... }). In Cloud Run this comes
 * from Secret Manager; locally from admin/secrets/admin-users.json via start script.
 */
export function loadUsers() {
  const raw = process.env.ADMIN_USERS;
  if (!raw) throw new Error('ADMIN_USERS not set');
  return JSON.parse(raw);
}

/** Generate a strong password: 4 groups of 4 chars → "abcd-efgh-ijkl-mnop". */
export function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars
  const pick = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return [pick(), pick(), pick(), pick()].join('-');
}
