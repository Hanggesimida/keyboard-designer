import { SetMetadata } from '@nestjs/common';

export const SKIP_MUST_CHANGE_PASSWORD_KEY = 'skipMustChangePassword';

export const SkipMustChangePassword = () =>
  SetMetadata(SKIP_MUST_CHANGE_PASSWORD_KEY, true);
