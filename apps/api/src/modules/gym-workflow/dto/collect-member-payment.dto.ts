import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CollectMemberPaymentDto {
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
