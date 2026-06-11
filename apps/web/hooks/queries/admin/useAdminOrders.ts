import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAdminOrders,
  getAdminOrder,
  updateOrderStatus,
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderStatusPayload }) =>
      updateOrderStatus(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(data.id) });
    },
  });
}
