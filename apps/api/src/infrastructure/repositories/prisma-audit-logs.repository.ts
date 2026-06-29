import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuditLogsRepository, CreateAuditLogInput } from "./repository.types";

@Injectable()
export class PrismaAuditLogsRepository implements AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        metadata: input.metadata ? this.inputJson(input.metadata) : undefined,
        userId: input.userId
      }
    });
  }

  private inputJson(value: object): Prisma.InputJsonObject {
    return value as unknown as Prisma.InputJsonObject;
  }
}
