import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split(":");

    if (algorithm !== "scrypt" || !salt || !hash) {
      return false;
    }

    const expected = Buffer.from(hash, "base64url");
    const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
