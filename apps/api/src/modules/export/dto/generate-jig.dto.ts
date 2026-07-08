import { IsObject } from 'class-validator';
import type { DesignPayload } from '../generate-jig';

export class GenerateJigDto {
  @IsObject()
  design!: DesignPayload;
}
