import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register, type LoginInput, type RegisterInput } from '@/lib/api/auth';
import { useUserStore } from '@/store/userStore';
import { userKeys } from '@/hooks/queries/users/useUsers';

export function useLogin() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}

export function useRegister() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => register(data),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}

export function useLogout() {
  const logout = useUserStore((s) => s.logout);
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();
  };
}
