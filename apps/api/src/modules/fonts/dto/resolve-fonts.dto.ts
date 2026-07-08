import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class ResolveFontsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}
