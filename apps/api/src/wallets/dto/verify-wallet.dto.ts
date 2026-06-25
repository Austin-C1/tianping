import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class VerifyWalletDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsInt()
  @Min(1)
  chainId!: number;

  @IsString()
  @IsNotEmpty()
  nonce!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}
