import { ConfigService } from "@nestjs/config";
import { TokenService } from "./token.service";

describe("TokenService", () => {
  const service = new TokenService(
    new ConfigService({
      JWT_ACCESS_SECRET: "test-secret"
    })
  );

  it("signs and verifies an access token", () => {
    const token = service.signAccessToken({
      userId: "user_123",
      email: "person@example.com",
      role: "ADMIN"
    });

    expect(service.verifyAccessToken(token)).toMatchObject({
      userId: "user_123",
      email: "person@example.com",
      role: "ADMIN"
    });
  });

  it("rejects a tampered token", () => {
    const token = service.signAccessToken({
      userId: "user_123",
      email: "person@example.com",
      role: "USER"
    });

    expect(service.verifyAccessToken(`${token}tampered`)).toBeNull();
  });
});
