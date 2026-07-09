import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSubAccounts,
  createSubAccount,
  updateSubAccount,
  resetSubAccountPassword,
  listTeamDesigns,
  type CreateSubAccountPayload,
  type UpdateSubAccountPayload,
  type QueryTeamDesignsParams,
} from '@/lib/api/enterprise';
import { createBatchOrder, type BatchCreateOrderPayload } from '@/lib/api/orders';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const enterpriseKeys = {
  subAccounts: ['enterprise', 'sub-accounts'] as const,
  teamDesigns: (params?: QueryTeamDesignsParams) =>
    ['enterprise', 'designs', params] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useSubAccounts() {
  const accessToken = useUserStore((s) => s.accessToken);
  const accountType = useUserStore((s) => s.user?.accountType);

  return useQuery({
    queryKey: enterpriseKeys.subAccounts,
    queryFn: listSubAccounts,
    enabled: !!accessToken && accountType === 'ENTERPRISE_MAIN',
  });
}

export function useTeamDesigns(params?: QueryTeamDesignsParams) {
  const accessToken = useUserStore((s) => s.accessToken);
  const accountType = useUserStore((s) => s.user?.accountType);

  return useQuery({
    queryKey: enterpriseKeys.teamDesigns(params),
    queryFn: () => listTeamDesigns(params),
    enabled: !!accessToken && accountType === 'ENTERPRISE_MAIN',
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSubAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSubAccountPayload) => createSubAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.subAccounts });
    },
  });
}

export function useUpdateSubAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateSubAccountPayload;
    }) => updateSubAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.subAccounts });
    },
  });
}

export function useResetSubAccountPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resetSubAccountPassword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.subAccounts });
    },
  });
}

export function useBatchCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BatchCreateOrderPayload) => createBatchOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'designs'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
