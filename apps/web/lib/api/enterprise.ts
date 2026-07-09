import { request } from './request';
import type { DesignStatus } from './designs';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubAccountSummary {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  designCount: number;
  draftCount: number;
  submittedCount: number;
  orderedCount: number;
}

export interface CreateSubAccountPayload {
  email: string;
  displayName: string;
}

export interface CreateSubAccountResult {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  /** 一次性明文初始密码，仅在创建时返回一次，请妥善转告设计师 */
  initialPassword: string;
}

export interface UpdateSubAccountPayload {
  displayName?: string;
  isActive?: boolean;
}

export interface TeamDesignSummary {
  id: string;
  name: string;
  previewUrl: string | null;
  status: DesignStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
}

export interface QueryTeamDesignsParams {
  status?: DesignStatus;
  subUserId?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export function listSubAccounts(): Promise<SubAccountSummary[]> {
  return request<SubAccountSummary[]>('/enterprise/sub-accounts');
}

export function createSubAccount(
  payload: CreateSubAccountPayload,
): Promise<CreateSubAccountResult> {
  return request<CreateSubAccountResult>('/enterprise/sub-accounts', {
    method: 'POST',
    body: payload,
  });
}

export function updateSubAccount(
  id: string,
  payload: UpdateSubAccountPayload,
): Promise<SubAccountSummary> {
  return request<SubAccountSummary>(`/enterprise/sub-accounts/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export interface ResetSubAccountPasswordResult {
  initialPassword: string;
}

export function resetSubAccountPassword(
  id: string,
): Promise<ResetSubAccountPasswordResult> {
  return request<ResetSubAccountPasswordResult>(
    `/enterprise/sub-accounts/${id}/reset-password`,
    { method: 'POST' },
  );
}

export function listTeamDesigns(
  params?: QueryTeamDesignsParams,
): Promise<TeamDesignSummary[]> {
  return request<TeamDesignSummary[]>('/enterprise/designs', { params });
}
