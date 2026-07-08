import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAdminUsers,
  updateUserRole,
  type QueryAdminUsersParams,
  type UpdateUserRolePayload,
} from '@/lib/api/admin-users';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  lists: (params?: QueryAdminUsersParams) =>
    [...adminUserKeys.all, 'list', params] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminUsers(params?: QueryAdminUsersParams) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: adminUserKeys.lists(params),
    queryFn: () => listAdminUsers(params),
    enabled: !!accessToken,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRolePayload }) =>
      updateUserRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}
