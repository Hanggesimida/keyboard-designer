import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  login,
  sendOtp,
  verifyOtp,
  setPassword,
  changePassword,
  changeInitialPassword,
  forgotPassword,
  resetPassword,
  isChangePasswordResponse,
  type LoginInput,
} from '@/lib/api/auth';
import { useUserStore } from '@/store/userStore';

export function useLogin() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: (res) => {
      if (!isChangePasswordResponse(res)) {
        queryClient.clear();
        setToken(res.accessToken);
      }
    },
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => sendOtp(email),
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

export function useChangeInitialPassword() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      password,
      changePasswordToken,
    }: {
      password: string;
      changePasswordToken: string;
    }) => changeInitialPassword(password, changePasswordToken),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
      sessionStorage.removeItem('change_password_token');
      sessionStorage.removeItem('otp_email');
    },
  });
}

export function useChangePassword() {
  const accessToken = useUserStore((s) => s.accessToken);
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { newPassword: string; currentPassword?: string }) =>
      changePassword(payload, accessToken ?? undefined),
    onSuccess: ({ accessToken: newToken }) => {
      queryClient.clear();
      setToken(newToken);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => forgotPassword(email),
  });
}

export function useResetPassword() {
  const setToken = useUserStore((s) => s.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      email,
      otp,
      password,
    }: {
      email: string;
      otp: string;
      password: string;
    }) => resetPassword(email, otp, password),
    onSuccess: ({ accessToken }) => {
      queryClient.clear();
      setToken(accessToken);
      sessionStorage.removeItem('reset_password_email');
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
