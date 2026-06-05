import { request } from './request';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────

export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/users/me');
}
