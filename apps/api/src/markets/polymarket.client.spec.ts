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
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=3&offset=0&order=volume24hr&ascending=false"
    );
  });

  it("paginates active Gamma events until the final short page", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "event_1", question: "Event 1?" },
          { id: "event_2", question: "Event 2?" }
        ]
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "event_3", question: "Event 3?" }
        ]
      } as Response);
    const client = new PolymarketClient(config({ POLYMARKET_FETCH_MODE: "fetch" }));

    await expect(client.fetchActiveMarkets(2)).resolves.toEqual([
      { id: "event_1", question: "Event 1?" },
      { id: "event_2", question: "Event 2?" },
      { id: "event_3", question: "Event 3?" }
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ search: "?active=true&closed=false&limit=2&offset=0&order=volume24hr&ascending=false" }),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ search: "?active=true&closed=false&limit=2&offset=2&order=volume24hr&ascending=false" }),
      expect.any(Object)
    );
  });

  it("caps active Gamma event page size to the public API maximum", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `event_${index}`,
      question: `Event ${index}?`
    }));
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstPage
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);
    const client = new PolymarketClient(config({ POLYMARKET_FETCH_MODE: "fetch" }));

    await expect(client.fetchActiveMarkets(500)).resolves.toEqual(firstPage);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=100&offset=0");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("limit=100&offset=100");
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
          script.includes("offset=0")
            ? JSON.stringify([
                {
                  markets: [
                    {
                      id: "market_2",
                      question: "Will ETH all-time high in 2026?"
                    }
                  ]
                }
              ])
            : JSON.stringify([]),
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

  it("uses POLYMARKET_CLOB_HOST for public CLOB order book requests", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => []
    } as Response);
    const client = new PolymarketClient(
      config({
        POLYMARKET_CLOB_HOST: "https://clob-staging.example",
        POLYMARKET_FETCH_MODE: "fetch"
      })
    );

    await expect(client.fetchOrderBooks(["token_yes"])).resolves.toEqual([]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://clob-staging.example/books");
  });
});

function config(values: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string, defaultValue?: string | number) => values[key] ?? defaultValue)
  } as unknown as ConfigService;
}
