import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaAuditLogsRepository } from "./prisma-audit-logs.repository";
import { PrismaDepositWalletsRepository } from "./prisma-deposit-wallets.repository";
import { PrismaFundingRepository } from "./prisma-funding.repository";
import { PrismaOrdersRepository } from "./prisma-orders.repository";
import { PrismaSyncJobRunsRepository } from "./prisma-sync-job-runs.repository";
import { PrismaWalletsRepository } from "./prisma-wallets.repository";
import {
  AUDIT_LOGS_REPOSITORY,
  DEPOSIT_WALLETS_REPOSITORY,
  FUNDING_REPOSITORY,
  ORDERS_REPOSITORY,
  SYNC_JOB_RUNS_REPOSITORY,
  WALLETS_REPOSITORY
} from "./repository.tokens";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaAuditLogsRepository,
    PrismaDepositWalletsRepository,
    PrismaFundingRepository,
    PrismaOrdersRepository,
    PrismaSyncJobRunsRepository,
    PrismaWalletsRepository,
    {
      provide: AUDIT_LOGS_REPOSITORY,
      useExisting: PrismaAuditLogsRepository
    },
    {
      provide: DEPOSIT_WALLETS_REPOSITORY,
      useExisting: PrismaDepositWalletsRepository
    },
    {
      provide: FUNDING_REPOSITORY,
      useExisting: PrismaFundingRepository
    },
    {
      provide: ORDERS_REPOSITORY,
      useExisting: PrismaOrdersRepository
    },
    {
      provide: SYNC_JOB_RUNS_REPOSITORY,
      useExisting: PrismaSyncJobRunsRepository
    },
    {
      provide: WALLETS_REPOSITORY,
      useExisting: PrismaWalletsRepository
    }
  ],
  exports: [
    AUDIT_LOGS_REPOSITORY,
    DEPOSIT_WALLETS_REPOSITORY,
    FUNDING_REPOSITORY,
    ORDERS_REPOSITORY,
    SYNC_JOB_RUNS_REPOSITORY,
    WALLETS_REPOSITORY
  ]
})
export class RepositoriesModule {}
