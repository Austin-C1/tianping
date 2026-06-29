import type { PreviewOrderInput, PreviewOrderResponse } from "@pmx/api-client";
import { createWebApiClient, readAccessToken } from "../api/api";

export type { PreviewOrderInput, PreviewOrderResponse } from "@pmx/api-client";

export async function previewOrder(input: PreviewOrderInput): Promise<PreviewOrderResponse | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().orders.preview(input);
}
