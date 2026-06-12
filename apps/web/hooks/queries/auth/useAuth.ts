import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register, type LoginInput, type RegisterInput } from '@/lib/api/auth';
import { useUserStore } from '@/store/userStore';

export function useLogin() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
    },
  });
}

type RegisterMutationInput =
  RegisterInput & {
    turnstileToken: string;
  };

export function useRegister() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterMutationInput) => register(data),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
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
