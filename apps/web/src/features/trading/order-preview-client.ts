import type {
  ManagedOrder,
  OrderIdInput,
  PreviewOrderInput,
  PreviewOrderResponse,
  SaveSignedOrderInput,
  SignedOrderResponse,
  SigningIntentResponse
} from "@pmx/api-client";
import { createWebApiClient, readAccessToken } from "../api/api";

export type {
  ManagedOrder,
  ManagedOrder as OrderListItem,
  OrderIdInput,
  PreviewOrderInput,
  PreviewOrderResponse,
  SaveSignedOrderInput,
  SignedOrderResponse,
  SigningIntentResponse
} from "@pmx/api-client";

export async function previewOrder(input: PreviewOrderInput): Promise<PreviewOrderResponse | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().orders.preview(input);
}

export async function createSigningIntent(
  input: OrderIdInput
): Promise<SigningIntentResponse | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().orders.createSigningIntent(input);
}

export async function saveSignedOrder(
  input: SaveSignedOrderInput
): Promise<SignedOrderResponse | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().orders.saveSignedOrder(input);
}

export async function submitOrder(input: OrderIdInput): Promise<ManagedOrder | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().orders.submit(input);
}

export async function listOrders(): Promise<ManagedOrder[]> {
  if (!readAccessToken()) {
    return [];
  }

  return createWebApiClient().orders.list();
}
