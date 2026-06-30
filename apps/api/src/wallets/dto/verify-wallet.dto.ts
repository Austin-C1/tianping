import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class VerifyWalletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  chainId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nonce!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
