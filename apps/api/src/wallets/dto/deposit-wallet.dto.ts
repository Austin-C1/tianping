import { IsInt, IsNotEmpty, IsObject, IsString, Min } from "class-validator";

export class CreateDepositWalletIntentDto {
  @IsString()
  @IsNotEmpty()
  ownerAddress!: string;

  @IsInt()
  @Min(1)
  chainId!: number;
}

export class SubmitDepositWalletSignedBatchDto {
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsObject()
  signedBatch!: Record<string, unknown>;
}
