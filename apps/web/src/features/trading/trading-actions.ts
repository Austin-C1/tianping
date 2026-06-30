import {
  createSigningIntent,
  previewOrder,
  saveSignedOrder,
  submitOrder,
  type ManagedOrder,
  type OrderIdInput,
  type PreviewOrderInput,
  type PreviewOrderResponse,
  type SaveSignedOrderInput,
  type SignedOrderResponse,
  type SigningIntentResponse
} from "./order-preview-client";

export type {
  ManagedOrder,
  OrderIdInput,
  PreviewOrderInput,
  PreviewOrderResponse,
  SaveSignedOrderInput,
  SignedOrderResponse,
  SigningIntentResponse
} from "./order-preview-client";

export async function previewTradeOrder(input: PreviewOrderInput): Promise<PreviewOrderResponse> {
  const preview = await previewOrder(input);

  if (!preview) {
    throw new Error("Authentication is required to preview orders");
  }

  return preview;
}

export async function createTradeSigningIntent(
  input: OrderIdInput
): Promise<SigningIntentResponse> {
  const signingIntent = await createSigningIntent(input);

  if (!signingIntent) {
    throw new Error("Authentication is required to sign orders");
  }

  return signingIntent;
}

export async function saveTradeSignedOrder(
  input: SaveSignedOrderInput
): Promise<SignedOrderResponse> {
  const signedOrder = await saveSignedOrder(input);

  if (!signedOrder) {
    throw new Error("Authentication is required to sign orders");
  }

  return signedOrder;
}

export async function submitTradeOrder(input: OrderIdInput): Promise<ManagedOrder> {
  const submittedOrder = await submitOrder(input);

  if (!submittedOrder) {
    throw new Error("Authentication is required to submit orders");
  }

  return submittedOrder;
}
