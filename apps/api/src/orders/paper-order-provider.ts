import { Injectable } from "@nestjs/common";

export interface PaperOrderSubmitInput {
  orderId: string;
  signedPayload: unknown;
}

export interface PaperOrderSubmitResult {
  clobOrderId: string;
  raw: Record<string, unknown>;
  status: "SUBMITTED";
}

@Injectable()
export class PaperOrderProvider {
  async submit(input: PaperOrderSubmitInput): Promise<PaperOrderSubmitResult> {
    return {
      clobOrderId: `paper_${input.orderId}`,
      raw: {
        mode: "paper",
        orderId: input.orderId,
        acceptedAt: new Date().toISOString()
      },
      status: "SUBMITTED"
    };
  }
}
