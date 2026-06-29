import {
  previewOrder,
  type PreviewOrderInput,
  type PreviewOrderResponse
} from "./order-preview-client";

export type { PreviewOrderInput, PreviewOrderResponse } from "./order-preview-client";

export async function previewTradeOrder(input: PreviewOrderInput): Promise<PreviewOrderResponse> {
  const preview = await previewOrder(input);

  if (!preview) {
    throw new Error("Authentication is required to preview orders");
  }

  return preview;
}
