export const PLATFORM_PHASES = [
  "engineering-skeleton",
  "user-system",
  "polymarket-market-data",
  "wallet-connection",
  "deposit-wallet",
  "deposit-guide",
  "order-preview",
  "signed-order-submission",
  "clob-cancel-and-order-status",
  "positions-and-history",
  "risk-and-compliance",
  "private-beta-acceptance"
] as const;

export type PlatformPhase = (typeof PLATFORM_PHASES)[number];

export const MANUAL_GATES = [
  "relayer-clob-builder-permissions",
  "deposit-wallet-creation",
  "geoblock-risk-deposit-copy",
  "real-order-confirmation",
  "small-real-trade-scope",
  "private-beta-readiness"
] as const;

export type ManualGate = (typeof MANUAL_GATES)[number];
