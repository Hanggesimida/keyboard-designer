import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName: string;
}
