import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class PreviewOrderDto {
  @ApiProperty()
  @IsString()
  marketId!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  outcomeIndex!: number;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amountUsd!: number;

  @ApiPropertyOptional({ enum: ["FAK", "FOK"] })
  @IsOptional()
  @IsIn(["FAK", "FOK"])
  orderType?: "FAK" | "FOK";
}
