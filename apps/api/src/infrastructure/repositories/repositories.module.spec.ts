import { Test } from "@nestjs/testing";
import {
  AUDIT_LOGS_REPOSITORY,
  DEPOSIT_WALLETS_REPOSITORY,
  FUNDING_REPOSITORY,
  ORDERS_REPOSITORY,
  SYNC_JOB_RUNS_REPOSITORY,
  WALLETS_REPOSITORY
} from "./repository.tokens";
import { RepositoriesModule } from "./repositories.module";

describe("RepositoriesModule", () => {
  it("binds all Prisma-backed repository tokens", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RepositoriesModule]
    }).compile();

    expect(moduleRef.get(ORDERS_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(WALLETS_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(DEPOSIT_WALLETS_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(FUNDING_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(AUDIT_LOGS_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(SYNC_JOB_RUNS_REPOSITORY)).toBeDefined();
  });
});
