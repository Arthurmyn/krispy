import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Node's built-in scrypt instead of adding a bcrypt dependency — same
// "use what's already there" approach as the AES-GCM key encryption in
// src/lib/crypto.ts. Output format: base64(salt).base64(hash).
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("base64")}.${derived.toString("base64")}`;
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  const [saltB64, hashB64] = hash.split(".");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
