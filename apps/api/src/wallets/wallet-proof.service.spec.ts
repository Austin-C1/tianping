import { BadRequestException } from "@nestjs/common";
import { privateKeyToAccount } from "viem/accounts";
import { WalletProofService } from "./wallet-proof.service";

describe("WalletProofService", () => {
  const userId = "user_1";
  const challengeMessage = "PMX wallet binding\nNonce: nonce_1";
  const account = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945387d863a4e64a88c8f1f1d5d8b0f0000001"
  );

  const createWalletsRepository = () => ({
    connectEoaWallet: jest.fn(),
    consumeChallenge: jest.fn(),
    createChallenge: jest.fn(),
    findChallengeByNonce: jest.fn()
  });

  it("creates a one-time wallet binding challenge", async () => {
    const walletsRepository = createWalletsRepository();
    walletsRepository.createChallenge.mockImplementation((input) =>
      Promise.resolve({
        expiresAt: input.expiresAt,
        message: input.message,
        nonce: input.nonce
      })
    );
    const service = new WalletProofService(walletsRepository as never);

    await expect(service.createChallenge({ userId })).resolves.toMatchObject({
      expiresAt: expect.any(Date),
      message: expect.stringContaining("PMX wallet binding"),
      nonce: expect.any(String)
    });
    expect(walletsRepository.createChallenge).toHaveBeenCalledWith({
      expiresAt: expect.any(Date),
      message: expect.stringContaining("PMX wallet binding"),
      nonce: expect.any(String),
      userId
    });
  });

  it("verifies an EOA signature and stores the wallet", async () => {
    const walletsRepository = createWalletsRepository();
    walletsRepository.findChallengeByNonce.mockResolvedValue({
      id: "challenge_1",
      userId,
      nonce: "nonce_1",
      message: challengeMessage,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    });
    walletsRepository.connectEoaWallet.mockResolvedValue({
      address: account.address,
      chainId: 137,
      type: "EOA"
    });
    const signature = await account.signMessage({ message: challengeMessage });
    const service = new WalletProofService(walletsRepository as never);

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
    expect(walletsRepository.connectEoaWallet).toHaveBeenCalledWith({
      address: account.address,
      chainId: 137,
      userId
    });
    expect(walletsRepository.consumeChallenge).toHaveBeenCalledWith({
      address: account.address,
      chainId: 137,
      challengeId: "challenge_1",
      consumedAt: expect.any(Date)
    });
  });

  it("rejects expired, consumed, and invalid wallet challenges", async () => {
    const walletsRepository = createWalletsRepository();
    const service = new WalletProofService(walletsRepository as never);
    const signature = await account.signMessage({ message: challengeMessage });

    walletsRepository.findChallengeByNonce.mockResolvedValueOnce({
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

    walletsRepository.findChallengeByNonce.mockResolvedValueOnce({
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

    walletsRepository.findChallengeByNonce.mockResolvedValueOnce({
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
