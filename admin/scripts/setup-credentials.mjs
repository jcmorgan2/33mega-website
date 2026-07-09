/**
 * Generate admin credentials + a JWT secret for the 33Mega admin app.
 * Usage: node scripts/setup-credentials.mjs email1 [email2 ...]
 * Writes secrets/admin-users.json, secrets/jwt-secret.txt and
 * secrets/PLAINTEXT-CREDENTIALS.txt (the last is for one-time hand-off — never commit).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashPassword, generatePassword } from '../lib/auth.mjs';

const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!emails.length) {
  console.error('Usage: node scripts/setup-credentials.mjs email1 [email2 ...]');
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'secrets');
fs.mkdirSync(dir, { recursive: true });

const users = {};
const plaintext = [];
for (const email of emails) {
  const pw = generatePassword();
  users[email] = hashPassword(pw);
  plaintext.push(`${email}  ${pw}`);
}

fs.writeFileSync(path.join(dir, 'admin-users.json'), JSON.stringify(users, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'jwt-secret.txt'), crypto.randomBytes(32).toString('hex'));
fs.writeFileSync(
  path.join(dir, 'PLAINTEXT-CREDENTIALS.txt'),
  `33Mega Admin credentials — share securely, then delete this file.\n\n${plaintext.join('\n')}\n`
);

console.log('Wrote secrets/admin-users.json, secrets/jwt-secret.txt');
console.log('Plaintext (share once, then delete secrets/PLAINTEXT-CREDENTIALS.txt):\n');
console.log(plaintext.join('\n'));
