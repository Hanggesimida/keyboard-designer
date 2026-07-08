import { request } from './request';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN';

export interface AdminUserSummary {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface QueryAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
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
