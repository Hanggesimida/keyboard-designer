import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type CreateAddressPayload,
  type UpdateAddressPayload,
} from '@/lib/api/addresses';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const addressKeys = {
  all: ['addresses'] as const,
  lists: () => [...addressKeys.all, 'list'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMyAddresses() {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: addressKeys.lists(),
    queryFn: listAddresses,
    enabled: !!accessToken,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAddressPayload) => createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAddressPayload }) =>
      updateAddress(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
}
