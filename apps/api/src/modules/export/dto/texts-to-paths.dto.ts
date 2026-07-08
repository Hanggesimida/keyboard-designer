import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TextDescriptorDto {
  @IsString()
  id!: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  fontSize!: number;

  @IsString()
  fontFamily!: string;

  @IsOptional()
  @IsNumber()
  fontWeight?: number;

  @IsOptional()
  @IsString()
  fontStyle?: string;

  @IsArray()
  @IsString({ each: true })
  lines!: string[];

  @IsNumber()
  lineHeightRatio!: number;

  @IsNumber()
  letterSpacing!: number;

  @IsString()
  fill!: string;
}

export class TextsToPathsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TextDescriptorDto)
  texts!: TextDescriptorDto[];
}
