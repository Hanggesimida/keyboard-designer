import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  login,
  sendOtp,
  verifyOtp,
  setPassword,
  type LoginInput,
} from '@/lib/api/auth';
import { useUserStore } from '@/store/userStore';

export function useLogin() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput & { turnstileToken?: string }) => login(data),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
    },
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: ({
      email,
      turnstileToken,
    }: {
      email: string;
      turnstileToken: string;
    }) => sendOtp(email, turnstileToken),
  });
}

export function useVerifyOtp() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      verifyOtp(email, otp),
    onSuccess: (res) => {
      if (res.action === 'logged_in') {
        queryClient.clear();
        setToken(res.accessToken);
      }
    },
  });
}

export function useSetPassword() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      password,
      setupToken,
    }: {
      password: string;
      setupToken: string;
    }) => setPassword(password, setupToken),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
      sessionStorage.removeItem('otp_setup_token');
      sessionStorage.removeItem('otp_email');
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
