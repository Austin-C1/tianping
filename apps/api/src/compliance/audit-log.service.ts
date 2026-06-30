import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogInput {
  action: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  userId?: string | null;
}

const SENSITIVE_KEYS = new Set(["privatekey", "private_key", "mnemonic", "seed", "secret"]);

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        ipAddress: input.ipAddress,
        metadata: this.sanitizeMetadata(input.metadata ?? {}),
        userAgent: input.userAgent,
        userId: input.userId ?? undefined
      }
    });
  }

  private sanitizeMetadata(value: unknown): Prisma.InputJsonObject {
    const sanitized = this.sanitizeValue(value);

    if (sanitized !== null && typeof sanitized === "object" && !Array.isArray(sanitized)) {
      return sanitized as Prisma.InputJsonObject;
    }

    return { value: sanitized } as Prisma.InputJsonObject;
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value === null || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
        .map(([key, item]) => [key, this.sanitizeValue(item)])
    );
  }
}
