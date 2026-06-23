import { execFile } from "node:child_process";
import { ConfigService } from "@nestjs/config";
import { PolymarketClient } from "./polymarket.client";

jest.mock("node:child_process", () => ({
  execFile: jest.fn()
}));

describe("PolymarketClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("loads active markets through the default fetch client", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          markets: [
            {
              id: "market_1",
              question: "Will BTC close above $100k this week?"
            }
          ]
        }
      ]
    } as Response);
    const client = new PolymarketClient(config({ POLYMARKET_FETCH_MODE: "fetch" }));

    await expect(client.fetchActiveMarkets(3)).resolves.toEqual([
      {
        id: "market_1",
        question: "Will BTC close above $100k this week?"
      }
    ]);

    const requestedUrl = fetchMock.mock.calls[0]?.[0];
    expect(String(requestedUrl)).toBe(
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=3&order=volume24hr&ascending=false"
    );
  });

  it("loads active markets through the PowerShell fallback when configured", async () => {
    const execFileMock = execFile as unknown as jest.Mock;
    execFileMock.mockImplementation(
      (command, args, options, callback) => {
        expect(command).toMatch(/powershell|pwsh/);
        expect(args).toContain("-EncodedCommand");
        const encodedCommand = args[args.indexOf("-EncodedCommand") + 1] as string;
        const script = Buffer.from(encodedCommand, "base64").toString("utf16le");
        expect(script).toContain("[Console]::OutputEncoding");
        expect(script).toContain("[Text.UTF8Encoding]");
        expect(script).toContain("[Net.WebRequest]::Create");
        expect(script).toContain("[IO.StreamReader]::new");
        expect(script).not.toContain("Invoke-WebRequest");
        expect(options).toEqual(expect.objectContaining({ timeout: 20_000 }));
        const done = callback as (error: Error | null, stdout: string, stderr: string) => void;
        done(
          null,
          JSON.stringify([
            {
              markets: [
                {
                  id: "market_2",
                  question: "Will ETH all-time high in 2026?"
                }
              ]
            }
          ]),
          ""
        );
        return {};
      }
    );
    const client = new PolymarketClient(
      config({
        POLYMARKET_FETCH_MODE: "powershell",
        POLYMARKET_FETCH_TIMEOUT_MS: "15000"
      })
    );

    await expect(client.fetchActiveMarkets(1)).resolves.toEqual([
      {
        id: "market_2",
        question: "Will ETH all-time high in 2026?"
      }
    ]);
  });

  it("loads public CLOB order books in one batch request", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          market: "condition_1",
          asset_id: "token_yes",
          hash: "book_hash",
          bids: [{ price: "0.25", size: "100" }],
          asks: [{ price: "0.27", size: "50" }],
          min_order_size: "5",
          tick_size: "0.01"
        }
      ]
    } as Response);
    const client = new PolymarketClient(config({ POLYMARKET_FETCH_MODE: "fetch" }));

    await expect(client.fetchOrderBooks(["token_yes"])).resolves.toEqual([
      {
        market: "condition_1",
        asset_id: "token_yes",
        hash: "book_hash",
        bids: [{ price: "0.25", size: "100" }],
        asks: [{ price: "0.27", size: "50" }],
        min_order_size: "5",
        tick_size: "0.01"
      }
    ]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://clob.polymarket.com/books");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify([{ token_id: "token_yes" }]),
        method: "POST"
      })
    );
  });
});

function config(values: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string, defaultValue?: string | number) => values[key] ?? defaultValue)
  } as unknown as ConfigService;
}
