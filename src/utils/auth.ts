import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algo, salt, hashHex] = storedHash.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) {
    return false;
  }

  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (computed.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(computed, expected);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
