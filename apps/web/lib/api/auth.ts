import { z } from 'zod';
import { request } from './request';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export const sendOtpSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .length(6, '验证码为 6 位数字')
    .regex(/^\d+$/, '验证码只能包含数字'),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, '密码至少 8 位').max(64, '密码最多 64 位'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: '两次密码不一致',
    path: ['confirm'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

// ─── Response types ──────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
}

export type VerifyOtpResponse =
  | { action: 'logged_in'; accessToken: string }
  | { action: 'setup_password'; setupToken: string };

// ─── API functions ───────────────────────────────────────────────────────────

export async function login(data: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: data,
  });
}

export async function sendOtp(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/send-otp', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  return request<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { email, otp },
  });
}

export async function setPassword(
  password: string,
  setupToken: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/set-password', {
    method: 'POST',
    body: { password },
    headers: { Authorization: `Bearer ${setupToken}` },
  });
}
