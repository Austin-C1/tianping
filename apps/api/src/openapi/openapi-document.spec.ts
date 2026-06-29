import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { createOpenApiDocument } from "./openapi-document";

describe("OpenAPI document", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("documents the public and authenticated API contract", async () => {
    app = await NestFactory.create(AppModule, { logger: false });

    const document = createOpenApiDocument(app);

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        "/auth/register",
        "/auth/login",
        "/auth/me",
        "/markets",
        "/markets/{id}",
        "/orders/preview",
        "/wallets/me",
        "/wallets/nonce",
        "/wallets/verify",
        "/wallets/deposit/create-intent",
        "/wallets/deposit/submit-signed-batch",
        "/wallets/deposit/status",
        "/wallets/balance-allowance/refresh",
        "/admin/summary",
        "/admin/gates",
        "/admin/environment",
        "/admin/users",
        "/admin/markets/sync"
      ])
    );
    expect(document.components?.securitySchemes?.bearer).toEqual(
      expect.objectContaining({
        scheme: "bearer",
        type: "http"
      })
    );
    expect(document.paths["/orders/preview"].post?.security).toEqual([
      { bearer: [] }
    ]);
    expect(
      document.paths["/auth/register"].post?.requestBody
    ).toBeDefined();
    expect(document.components?.schemas?.RegisterDto).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining(["email", "password"])
      })
    );
    expect(document.components?.schemas?.AuthResultDto).toBeDefined();
    expect(document.components?.schemas?.WalletReadinessDto).toBeDefined();
    expect(document.components?.schemas?.PreviewOrderResponseDto).toBeDefined();
  });
});
