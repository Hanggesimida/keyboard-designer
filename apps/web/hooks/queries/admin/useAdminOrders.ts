import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  refundOrder,
  getProductionBoard,
  type QueryAdminOrdersParams,
  type UpdateOrderStatusPayload,
} from '@/lib/api/admin-orders';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const adminOrderKeys = {
  all: ['admin', 'orders'] as const,
  lists: (params?: QueryAdminOrdersParams) =>
    [...adminOrderKeys.all, 'list', params] as const,
  detail: (id: string) => [...adminOrderKeys.all, 'detail', id] as const,
  productionBoard: () => [...adminOrderKeys.all, 'production-board'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminOrders(params?: QueryAdminOrdersParams) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: adminOrderKeys.lists(params),
    queryFn: () => listAdminOrders(params),
    enabled: !!accessToken,
  });
}

export function useAdminOrder(id: string | null | undefined) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: adminOrderKeys.detail(id!),
    queryFn: () => getAdminOrder(id!),
    enabled: !!accessToken && !!id,
  });
}

export function useProductionBoard() {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: adminOrderKeys.productionBoard(),
    queryFn: () => getProductionBoard(),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderStatusPayload }) =>
      updateOrderStatus(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.productionBoard() });
    },
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      refundOrder(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.productionBoard() });
    },
  });
}
