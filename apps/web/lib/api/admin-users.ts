import { request } from './request';
import type { AccountType } from './users';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN';
export type { AccountType };

export interface AdminUserSummary {
  id: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  createdAt: string;
}

export interface QueryAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  accountType?: AccountType;
}

export interface PaginatedAdminUsers {
  total: number;
  page: number;
  limit: number;
  items: AdminUserSummary[];
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface UpdateAccountTypePayload {
  accountType: 'NORMAL' | 'ENTERPRISE_MAIN';
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function listAdminUsers(
  params?: QueryAdminUsersParams,
): Promise<PaginatedAdminUsers> {
  return request<PaginatedAdminUsers>('/admin/users', { params });
}

export async function updateUserRole(
  id: string,
  payload: UpdateUserRolePayload,
): Promise<AdminUserSummary> {
  return request<AdminUserSummary>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateUserAccountType(
  id: string,
  payload: UpdateAccountTypePayload,
): Promise<AdminUserSummary> {
  return request<AdminUserSummary>(`/admin/users/${id}/account-type`, {
    method: 'PATCH',
    body: payload,
  });
}
