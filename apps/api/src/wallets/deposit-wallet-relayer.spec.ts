import { ServiceUnavailableException } from "@nestjs/common";
import { deriveBeaconDepositWallet } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { ConfiguredDepositWalletRelayer } from "./deposit-wallet-relayer";

describe("ConfiguredDepositWalletRelayer", () => {
  const ownerAddress = "0x0000000000000000000000000000000000000001";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prepares an official WALLET-CREATE request and predicted Deposit Wallet address without private keys", async () => {
    const relayer = new ConfiguredDepositWalletRelayer(createConfig());

    const prepared = await relayer.prepareCreateWalletBatch({
      chainId: 137,
      ownerAddress
    });

    expect(prepared).toMatchObject({
      actions: [
        {
          type: "CREATE_DEPOSIT_WALLET"
        }
      ],
      relayerRequest: {
        from: ownerAddress,
        type: "WALLET-CREATE"
      }
    });
    expect(prepared.depositWalletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(JSON.stringify(prepared)).not.toContain("private");
  });

  it("derives beacon Deposit Wallet addresses when an RPC URL is configured", async () => {
    const beaconAddress = "0x3333333333333333333333333333333333333333";
    const factoryAddress = "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07";
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        result: `0x${"0".repeat(24)}${beaconAddress.slice(2)}`
      })
    } as Response);
    const relayer = new ConfiguredDepositWalletRelayer(
      createConfig({
        POLYMARKET_RPC_URL: "https://polygon-rpc.test"
      })
    );

    const prepared = await relayer.prepareCreateWalletBatch({
      chainId: 137,
      ownerAddress
    });

    expect(prepared.depositWalletAddress).toBe(
      deriveBeaconDepositWallet(ownerAddress, factoryAddress, beaconAddress)
    );
    expect(fetchMock).toHaveBeenCalledWith("https://polygon-rpc.test", {
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            data: "0x49493a4d",
            to: factoryAddress
          },
          "latest"
        ]
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("submits a browser-signed wallet batch to the Relayer API with Relayer API key headers", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        state: "STATE_NEW",
        transactionID: "relayer_tx_1"
      })
    } as Response);
    const relayer = new ConfiguredDepositWalletRelayer(
      createConfig({
        POLYMARKET_RELAYER_API_KEY: "relayer-key",
        POLYMARKET_RELAYER_API_KEY_ADDRESS: ownerAddress,
        POLYMARKET_RELAYER_URL: "https://relayer.test/"
      })
    );

    await expect(
      relayer.submitSignedBatch({
        depositWalletAddress: "0x2222222222222222222222222222222222222222",
        relayerRequest: {
          from: ownerAddress,
          to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
          type: "WALLET-CREATE"
        }
      })
    ).resolves.toEqual({
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      raw: {
        state: "STATE_NEW",
        transactionID: "relayer_tx_1"
      },
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });

    expect(fetchMock).toHaveBeenCalledWith("https://relayer.test/submit", {
      body: JSON.stringify({
        from: ownerAddress,
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      }),
      headers: {
        "Content-Type": "application/json",
        RELAYER_API_KEY: "relayer-key",
        RELAYER_API_KEY_ADDRESS: ownerAddress
      },
      method: "POST"
    });
  });

  it("maps rejected Relayer responses into user-facing errors", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "relayer unavailable"
    } as Response);
    const relayer = new ConfiguredDepositWalletRelayer(
      createConfig({
        POLYMARKET_RELAYER_API_KEY: "relayer-key",
        POLYMARKET_RELAYER_API_KEY_ADDRESS: ownerAddress
      })
    );

    await expect(
      relayer.submitSignedBatch({
        relayerRequest: {
          from: ownerAddress,
          to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
          type: "WALLET-CREATE"
        }
      })
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

function createConfig(values: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string) => values[key])
  } as never;
}
