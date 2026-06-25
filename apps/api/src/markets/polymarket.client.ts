import { execFile } from "node:child_process";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_POLYMARKET_CLOB_HOST } from "../order-router/order-router.config";
import type { PolymarketMarketSource } from "./markets.service";

interface GammaEventSource {
  markets?: PolymarketMarketSource[];
}

interface GammaPageSource {
  data?: Array<GammaEventSource | PolymarketMarketSource>;
  events?: Array<GammaEventSource | PolymarketMarketSource>;
  hasMore?: boolean;
  has_more?: boolean;
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
  neg_risk?: boolean;
  tick_size?: string;
  last_trade_price?: string;
}

type PolymarketFetchMode = "fetch" | "powershell";
type GammaPayload = GammaEventSource[] | PolymarketMarketSource[] | GammaPageSource;

const DEFAULT_GAMMA_PAGE_SIZE = 100;
const MAX_GAMMA_PAGE_SIZE = 100;
const MAX_GAMMA_PAGES = 50;

@Injectable()
export class PolymarketClient {
  private readonly baseUrl: string;
  private readonly clobBaseUrl: string;
  private readonly fetchMode: PolymarketFetchMode;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_GAMMA_API_URL", "https://gamma-api.polymarket.com");
    this.clobBaseUrl = config.get<string>(
      "POLYMARKET_CLOB_HOST",
      config.get<string>("POLYMARKET_CLOB_API_URL", DEFAULT_POLYMARKET_CLOB_HOST)
    );
    this.fetchMode = this.fetchModeValue(config.get<string>("POLYMARKET_FETCH_MODE", this.defaultFetchMode()));
    this.timeoutMs = Number(config.get<string>("POLYMARKET_FETCH_TIMEOUT_MS", "15000"));
  }

  async fetchActiveMarkets(limit = DEFAULT_GAMMA_PAGE_SIZE): Promise<PolymarketMarketSource[]> {
    const pageSize = Math.min(Math.max(1, limit), MAX_GAMMA_PAGE_SIZE);
    const markets: PolymarketMarketSource[] = [];

    for (let page = 0; page < MAX_GAMMA_PAGES; page += 1) {
      const payload = await this.fetchActiveMarketsPage(pageSize, page * pageSize);
      const items = this.gammaPageItems(payload);
      markets.push(...this.marketSources(items));

      if (!this.hasMoreGammaPages(payload, items.length, pageSize)) {
        break;
      }
    }

    return markets;
  }

  private async fetchActiveMarketsPage(limit: number, offset: number): Promise<GammaPayload> {
    const url = new URL("/events", this.baseUrl);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order", "volume24hr");
    url.searchParams.set("ascending", "false");

    return this.fetchGammaJson(url);
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

  private async fetchGammaJson(url: URL): Promise<GammaPayload> {
    if (this.fetchMode === "powershell") {
      return this.fetchWithPowerShell(url);
    }

    return this.fetchWithNode(url);
  }

  private async fetchWithNode(url: URL): Promise<GammaPayload> {
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

    return (await response.json()) as GammaPayload;
  }

  private async fetchWithPowerShell(url: URL): Promise<GammaPayload> {
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
      return JSON.parse(stdout) as GammaPayload;
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

  private gammaPageItems(payload: GammaPayload): Array<GammaEventSource | PolymarketMarketSource> {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.events)) {
      return payload.events;
    }

    return Array.isArray(payload.markets) ? payload.markets : [];
  }

  private hasMoreGammaPages(payload: GammaPayload, itemCount: number, pageSize: number) {
    if (!Array.isArray(payload)) {
      if (typeof payload.hasMore === "boolean") {
        return payload.hasMore;
      }

      if (typeof payload.has_more === "boolean") {
        return payload.has_more;
      }
    }

    return itemCount === pageSize;
  }

  private marketSources(payload: Array<GammaEventSource | PolymarketMarketSource>) {
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
