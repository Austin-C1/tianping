import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  RelayClient,
  buildDepositWalletCreateRequest
} from "@polymarket/builder-relayer-client";
import {
  deriveBeaconDepositWallet,
  deriveUupsDepositWallet
} from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getAddress, zeroAddress } from "viem";

export interface DepositWalletRelayerResult {
  status: "PENDING" | "CONFIRMED" | "FAILED";
  relayerTransactionId: string | null;
  depositWalletAddress: string | null;
  raw: unknown;
}

export interface DepositWalletRelayerPreparedBatch {
  actions: Array<{
    type: "CREATE_DEPOSIT_WALLET";
  }>;
  depositWalletAddress: string;
  relayerRequest: Record<string, unknown>;
}

export interface DepositWalletRelayer {
  prepareCreateWalletBatch(input: {
    ownerAddress: string;
    chainId: number;
  }): Promise<DepositWalletRelayerPreparedBatch>;
  submitSignedBatch(signedBatch: Record<string, unknown>): Promise<DepositWalletRelayerResult>;
}

export const DEPOSIT_WALLET_RELAYER = Symbol("DEPOSIT_WALLET_RELAYER");
export const DEFAULT_POLYMARKET_RELAYER_URL = "https://relayer-v2.polymarket.com";

@Injectable()
export class ConfiguredDepositWalletRelayer implements DepositWalletRelayer {
  constructor(private readonly config: ConfigService) {}

  async prepareCreateWalletBatch(input: {
    ownerAddress: string;
    chainId: number;
  }): Promise<DepositWalletRelayerPreparedBatch> {
    const relayClient = this.createRelayClient(input.chainId);
    const depositWalletConfig = relayClient.contractConfig.DepositWalletContracts;
    const relayerRequest = buildDepositWalletCreateRequest(input.ownerAddress, depositWalletConfig);
    const depositWalletAddress = await this.deriveDepositWalletAddress(
      input.ownerAddress,
      depositWalletConfig.DepositWalletFactory,
      depositWalletConfig.DepositWalletImplementation
    );

    return {
      actions: [{ type: "CREATE_DEPOSIT_WALLET" }],
      depositWalletAddress,
      relayerRequest: relayerRequest as unknown as Record<string, unknown>
    };
  }

  async submitSignedBatch(signedBatch: Record<string, unknown>): Promise<DepositWalletRelayerResult> {
    const relayerApiKey = this.config.get<string>("POLYMARKET_RELAYER_API_KEY")?.trim();
    const relayerApiKeyAddress = this.config
      .get<string>("POLYMARKET_RELAYER_API_KEY_ADDRESS")
      ?.trim();

    if (!relayerApiKey || !relayerApiKeyAddress) {
      throw new ServiceUnavailableException("Polymarket relayer is not configured");
    }

    const requestBody = this.extractRelayerRequest(signedBatch);
    const response = await fetch(`${this.relayerUrl()}/submit`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
        RELAYER_API_KEY: relayerApiKey,
        RELAYER_API_KEY_ADDRESS: relayerApiKeyAddress
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(await this.relayerErrorMessage(response));
    }

    const raw = (await response.json()) as Record<string, unknown>;

    return {
      depositWalletAddress: this.stringValue(signedBatch.depositWalletAddress),
      raw,
      relayerTransactionId: this.stringValue(raw.transactionID ?? raw.transactionId),
      status: this.mapRelayerStatus(this.stringValue(raw.state ?? raw.status))
    };
  }

  private createRelayClient(chainId: number): RelayClient {
    return new RelayClient(this.relayerUrl(), chainId);
  }

  private async deriveDepositWalletAddress(
    ownerAddress: string,
    factoryAddress: string,
    implementationAddress: string
  ): Promise<string> {
    const uupsAddress = deriveUupsDepositWallet(
      ownerAddress,
      factoryAddress,
      implementationAddress
    );
    const beaconAddress = await this.getDepositWalletFactoryBeacon(factoryAddress);

    if (!beaconAddress || beaconAddress.toLowerCase() === zeroAddress.toLowerCase()) {
      return uupsAddress;
    }

    return deriveBeaconDepositWallet(ownerAddress, factoryAddress, beaconAddress);
  }

  private async getDepositWalletFactoryBeacon(factoryAddress: string): Promise<string | null> {
    const rpcUrl = this.config.get<string>("POLYMARKET_RPC_URL")?.trim();
    if (!rpcUrl) {
      return null;
    }

    const response = await fetch(rpcUrl, {
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

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Polymarket RPC request failed with ${response.status}`
      );
    }

    const payload = (await response.json()) as { result?: unknown };
    if (typeof payload.result !== "string" || payload.result.length < 42) {
      return null;
    }

    return getAddress(`0x${payload.result.slice(-40)}`);
  }

  private extractRelayerRequest(signedBatch: Record<string, unknown>): Record<string, unknown> {
    if (
      signedBatch.relayerRequest &&
      typeof signedBatch.relayerRequest === "object" &&
      !Array.isArray(signedBatch.relayerRequest)
    ) {
      return signedBatch.relayerRequest as Record<string, unknown>;
    }

    return signedBatch;
  }

  private mapRelayerStatus(status: string | null): DepositWalletRelayerResult["status"] {
    if (status === "STATE_CONFIRMED") {
      return "CONFIRMED";
    }

    if (status === "STATE_FAILED" || status === "STATE_INVALID") {
      return "FAILED";
    }

    return "PENDING";
  }

  private async relayerErrorMessage(response: Response): Promise<string> {
    const text = await response.text();

    return text.trim() || `Polymarket relayer request failed with ${response.status}`;
  }

  private relayerUrl(): string {
    const value = this.config.get<string>("POLYMARKET_RELAYER_URL")?.trim();

    return (value || DEFAULT_POLYMARKET_RELAYER_URL).replace(/\/+$/, "");
  }

  private stringValue(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }
}
