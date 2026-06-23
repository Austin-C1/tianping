import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AccessTokenPayload } from "./auth.types";

interface JwtPayload extends AccessTokenPayload {
  exp: number;
}

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const header = {
      alg: "HS256",
      typ: "JWT"
    };
    const body: JwtPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    };
    const encodedHeader = this.encodeJson(header);
    const encodedBody = this.encodeJson(body);
    const signature = this.sign(`${encodedHeader}.${encodedBody}`);

    return `${encodedHeader}.${encodedBody}.${signature}`;
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    const [encodedHeader, encodedBody, signature] = token.split(".");

    if (!encodedHeader || !encodedBody || !signature) {
      return null;
    }

    const expectedSignature = this.sign(`${encodedHeader}.${encodedBody}`);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const payload = this.decodeJson<JwtPayload>(encodedBody);

    if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email
    };
  }

  requireAccessToken(token: string): AccessTokenPayload {
    const payload = this.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedException("Invalid access token");
    }

    return payload;
  }

  private encodeJson(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private decodeJson<T>(value: string): T | null {
    try {
      return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    const secret = this.config.get<string>("JWT_ACCESS_SECRET");

    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is required");
    }

    return createHmac("sha256", secret).update(value).digest("base64url");
  }
}
