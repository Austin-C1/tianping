import { execFile } from "node:child_process";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PolymarketMarketSource } from "./markets.service";

interface GammaEventSource {
  markets?: PolymarketMarketSource[];
}

export interface ClobOrderBookLevel {
  price: string;
  size: string;
}

export interface ClobOrderBookSource {
  market?: string;
  asset_id: string;
  hash?: string;
  bids?: ClobOrderBookLevel[];
  asks?: ClobOrderBookLevel[];
  min_order_size?: string;
  tick_size?: string;
  last_trade_price?: string;
}

type PolymarketFetchMode = "fetch" | "powershell";

@Injectable()
export class PolymarketClient {
  private readonly baseUrl: string;
  private readonly clobBaseUrl: string;
  private readonly fetchMode: PolymarketFetchMode;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_GAMMA_API_URL", "https://gamma-api.polymarket.com");
    this.clobBaseUrl = config.get<string>("POLYMARKET_CLOB_API_URL", "https://clob.polymarket.com");
    this.fetchMode = this.fetchModeValue(config.get<string>("POLYMARKET_FETCH_MODE", this.defaultFetchMode()));
    this.timeoutMs = Number(config.get<string>("POLYMARKET_FETCH_TIMEOUT_MS", "15000"));
  }

  async fetchActiveMarkets(limit = 50): Promise<PolymarketMarketSource[]> {
    const url = new URL("/events", this.baseUrl);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("order", "volume24hr");
    url.searchParams.set("ascending", "false");

    const payload = await this.fetchGammaJson(url);
    return this.marketSources(payload);
  }

  async fetchOrderBooks(tokenIds: string[]): Promise<ClobOrderBookSource[]> {
    if (tokenIds.length === 0) {
      return [];
    }

    const url = new URL("/books", this.clobBaseUrl);
    const body = JSON.stringify(tokenIds.map((tokenId) => ({ token_id: tokenId })));

    if (this.fetchMode === "powershell") {
      return this.fetchOrderBooksWithPowerShell(url, body);
    }

    return this.fetchOrderBooksWithNode(url, body);
  }

  private async fetchGammaJson(url: URL): Promise<GammaEventSource[] | PolymarketMarketSource[]> {
    if (this.fetchMode === "powershell") {
      return this.fetchWithPowerShell(url);
    }

    return this.fetchWithNode(url);
  }

  private async fetchWithNode(url: URL): Promise<GammaEventSource[] | PolymarketMarketSource[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "user-agent": "pmx-local-dev/0.1"
        },
        signal: controller.signal
      });
    } catch (error) {
      throw new Error(
        `Polymarket Gamma request failed: ${this.errorMessage(error)}. If local Windows Node HTTPS is blocked, set POLYMARKET_FETCH_MODE=powershell.`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Polymarket Gamma request failed with ${response.status}`);
    }

    return (await response.json()) as GammaEventSource[] | PolymarketMarketSource[];
  }

  private async fetchWithPowerShell(url: URL): Promise<GammaEventSource[] | PolymarketMarketSource[]> {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)",
      "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
      `$request = [Net.WebRequest]::Create(${this.powerShellString(String(url))})`,
      "$request.Method = 'GET'",
      "$request.UserAgent = 'pmx-local-dev/0.1'",
      `$request.Timeout = ${this.timeoutMs}`,
      "$response = $request.GetResponse()",
      "try { $stream = $response.GetResponseStream(); $reader = [IO.StreamReader]::new($stream, [Text.UTF8Encoding]::new($false)); try { $reader.ReadToEnd() } finally { $reader.Dispose() } } finally { $response.Dispose() }"
    ].join("; ");
    const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
    const command = process.platform === "win32" ? "powershell.exe" : "pwsh";
    const stdout = await this.execFile(command, [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      encodedCommand
    ]);

    try {
      return JSON.parse(stdout) as GammaEventSource[] | PolymarketMarketSource[];
    } catch (error) {
      throw new Error(`Polymarket Gamma PowerShell response was not valid JSON: ${this.errorMessage(error)}`);
    }
  }

  private async fetchOrderBooksWithNode(url: URL, body: string): Promise<ClobOrderBookSource[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        body,
        headers: {
          "content-type": "application/json",
          "user-agent": "pmx-local-dev/0.1"
        },
        method: "POST",
        signal: controller.signal
      });
    } catch (error) {
      throw new Error(`Polymarket CLOB books request failed: ${this.errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Polymarket CLOB books request failed with ${response.status}`);
    }

    return (await response.json()) as ClobOrderBookSource[];
  }

  private async fetchOrderBooksWithPowerShell(url: URL, body: string): Promise<ClobOrderBookSource[]> {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)",
      "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
      `$request = [Net.WebRequest]::Create(${this.powerShellString(String(url))})`,
      "$request.Method = 'POST'",
      "$request.UserAgent = 'pmx-local-dev/0.1'",
      "$request.ContentType = 'application/json'",
      `$request.Timeout = ${this.timeoutMs}`,
      `$body = ${this.powerShellString(body)}`,
      "$bytes = [Text.UTF8Encoding]::new($false).GetBytes($body)",
      "$request.ContentLength = $bytes.Length",
      "$requestStream = $request.GetRequestStream()",
      "try { $requestStream.Write($bytes, 0, $bytes.Length) } finally { $requestStream.Dispose() }",
      "$response = $request.GetResponse()",
      "try { $stream = $response.GetResponseStream(); $reader = [IO.StreamReader]::new($stream, [Text.UTF8Encoding]::new($false)); try { $reader.ReadToEnd() } finally { $reader.Dispose() } } finally { $response.Dispose() }"
    ].join("; ");
    const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
    const command = process.platform === "win32" ? "powershell.exe" : "pwsh";
    const stdout = await this.execFile(command, [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      encodedCommand
    ]);

    try {
      return JSON.parse(stdout) as ClobOrderBookSource[];
    } catch (error) {
      throw new Error(`Polymarket CLOB PowerShell response was not valid JSON: ${this.errorMessage(error)}`);
    }
  }

  private marketSources(payload: GammaEventSource[] | PolymarketMarketSource[]) {
    return payload.flatMap((item) => ("markets" in item && Array.isArray(item.markets) ? item.markets : [item as PolymarketMarketSource]));
  }

  private execFile(command: string, args: string[]) {
    return new Promise<string>((resolve, reject) => {
      execFile(
        command,
        args,
        {
          maxBuffer: 25 * 1024 * 1024,
          timeout: this.timeoutMs + 5000
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Polymarket Gamma PowerShell request failed: ${stderr || error.message}`));
            return;
          }

          resolve(stdout);
        }
      );
    });
  }

  private fetchModeValue(value: string): PolymarketFetchMode {
    return value === "powershell" ? "powershell" : "fetch";
  }

  private defaultFetchMode(): PolymarketFetchMode {
    return process.platform === "win32" ? "powershell" : "fetch";
  }

  private powerShellString(value: string) {
    return `'${value.replaceAll("'", "''")}'`;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
