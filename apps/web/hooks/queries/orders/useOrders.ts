import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listOrders,
  getOrder,
  createOrder,
  cancelOrder,
  type CreateOrderPayload,
  type QueryOrdersParams,
} from '@/lib/api/orders';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const orderKeys = {
  all: ['orders'] as const,
  lists: (params?: QueryOrdersParams) => [...orderKeys.all, 'list', params] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMyOrders(params?: QueryOrdersParams) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: orderKeys.lists(params),
    queryFn: () => listOrders(params),
    enabled: !!accessToken,
  });
}

export function useOrder(id: string | null | undefined) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn: () => getOrder(id!),
    enabled: !!accessToken && !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(data.id) });
    },
  });
}
