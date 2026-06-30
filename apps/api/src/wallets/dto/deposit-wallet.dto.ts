import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsObject, IsString, Min } from "class-validator";

export class CreateDepositWalletIntentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerAddress!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  chainId!: number;
}

export class SubmitDepositWalletSignedBatchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  signedBatch!: Record<string, unknown>;
}
