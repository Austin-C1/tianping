import { IsObject, IsString } from "class-validator";

export class OrderIdDto {
  @IsString()
  orderId!: string;
}

export class SaveSignedOrderDto extends OrderIdDto {
  @IsObject()
  signedPayload!: Record<string, unknown>;
}
