import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class PreviewOrderDto {
  @IsString()
  marketId!: string;

  @IsInt()
  @Min(0)
  outcomeIndex!: number;

  @IsNumber()
  @Min(0.01)
  amountUsd!: number;

  @IsOptional()
  @IsIn(["FAK", "FOK"])
  orderType?: "FAK" | "FOK";
}
