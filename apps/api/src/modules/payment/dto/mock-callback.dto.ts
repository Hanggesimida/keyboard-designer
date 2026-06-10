import { IsString } from 'class-validator';

export class MockCallbackDto {
  @IsString()
  paymentId: string;
}
