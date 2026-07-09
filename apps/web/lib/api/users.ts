import { request } from './request';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AccountType = 'NORMAL' | 'ENTERPRISE_MAIN' | 'ENTERPRISE_SUB';

export interface UserProfile {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  accountType: AccountType;
  parentId?: string | null;
  mustChangePassword?: boolean;
  hasPassword?: boolean;
  passwordChangedAt?: string | null;
}

// ─── API Functions ─────────────────────────────────────────────────────────

export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/users/me');
}
