import { BadRequestException } from "@nestjs/common";
import { privateKeyToAccount } from "viem/accounts";
import { WalletProofService } from "./wallet-proof.service";

describe("WalletProofService", () => {
  const userId = "user_1";
  const challengeMessage = "PMX wallet binding\nNonce: nonce_1";
  const account = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945387d863a4e64a88c8f1f1d5d8b0f0000001"
  );

  const createPrisma = () => ({
    walletChallenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    wallet: {
      upsert: jest.fn()
    }
  });

  it("creates a one-time wallet binding challenge", async () => {
    const prisma = createPrisma();
    prisma.walletChallenge.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "challenge_1",
        ...data
      })
    );
    const service = new WalletProofService(prisma as never);

    await expect(service.createChallenge({ userId })).resolves.toMatchObject({
      expiresAt: expect.any(Date),
      message: expect.stringContaining("PMX wallet binding"),
      nonce: expect.any(String)
    });
    expect(prisma.walletChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: expect.stringContaining("PMX wallet binding"),
        nonce: expect.any(String),
        userId
      }),
      select: {
        expiresAt: true,
        message: true,
        nonce: true
      }
    });
  });

  it("verifies an EOA signature and stores the wallet", async () => {
    const prisma = createPrisma();
    prisma.walletChallenge.findUnique.mockResolvedValue({
      id: "challenge_1",
      userId,
      nonce: "nonce_1",
      message: challengeMessage,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    });
    prisma.wallet.upsert.mockResolvedValue({
      address: account.address,
      chainId: 137,
      type: "EOA"
    });
    const signature = await account.signMessage({ message: challengeMessage });
    const service = new WalletProofService(prisma as never);

    await expect(
      service.verifyWallet(
        {
          address: account.address,
          chainId: 137,
          nonce: "nonce_1",
          signature
        },
        { userId }
      )
    ).resolves.toEqual({
      address: account.address,
      chainId: 137,
      status: "CONNECTED"
    });
    expect(prisma.wallet.upsert).toHaveBeenCalledWith({
      create: {
        address: account.address,
        chainId: 137,
        type: "EOA",
        userId
      },
      update: {},
      where: {
        userId_type_address_chainId: {
          address: account.address,
          chainId: 137,
          type: "EOA",
          userId
        }
      }
    });
    expect(prisma.walletChallenge.update).toHaveBeenCalledWith({
      data: {
        address: account.address,
        chainId: 137,
        consumedAt: expect.any(Date)
      },
      where: { id: "challenge_1" }
    });
  });

  it("rejects expired, consumed, and invalid wallet challenges", async () => {
    const prisma = createPrisma();
    const service = new WalletProofService(prisma as never);
    const signature = await account.signMessage({ message: challengeMessage });

    prisma.walletChallenge.findUnique.mockResolvedValueOnce({
      id: "challenge_1",
      userId,
      nonce: "nonce_1",
      message: challengeMessage,
      expiresAt: new Date(Date.now() - 1_000),
      consumedAt: null
    });
    await expect(
      service.verifyWallet({ address: account.address, chainId: 137, nonce: "nonce_1", signature }, { userId })
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.walletChallenge.findUnique.mockResolvedValueOnce({
      id: "challenge_1",
      userId,
      nonce: "nonce_1",
      message: challengeMessage,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date()
    });
    await expect(
      service.verifyWallet({ address: account.address, chainId: 137, nonce: "nonce_1", signature }, { userId })
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.walletChallenge.findUnique.mockResolvedValueOnce({
      id: "challenge_1",
      userId,
      nonce: "nonce_1",
      message: challengeMessage,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    });
    await expect(
      service.verifyWallet({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        nonce: "nonce_1",
        signature
      }, { userId })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
