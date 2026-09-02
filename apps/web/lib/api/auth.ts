import { z } from 'zod';
import { request } from './request';

// ─── Schemas ────────────────────────────────────────────────────────────────

type Translate = (
  key:
    | "invalidEmail"
    | "passwordRequired"
    | "otpLength"
    | "otpDigits"
    | "passwordMin"
    | "passwordMax"
    | "passwordMismatch"
    | "currentPasswordRequired",
) => string;

const defaultT: Translate = (key) => key;

export function createLoginSchema(t: Translate) {
  return z.object({
    email: z.string().email(t('invalidEmail')),
    password: z.string().min(1, t('passwordRequired')),
  });
}

export function createSendOtpSchema(t: Translate) {
  return z.object({
    email: z.string().email(t('invalidEmail')),
  });
}

export function createVerifyOtpSchema(t: Translate) {
  return z.object({
    otp: z
      .string()
      .length(6, t('otpLength'))
      .regex(/^\d+$/, t('otpDigits')),
  });
}

export function createSetPasswordSchema(t: Translate) {
  return z
    .object({
      password: z.string().min(8, t('passwordMin')).max(64, t('passwordMax')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t('passwordMismatch'),
      path: ['confirm'],
    });
}

export function createChangePasswordSchema(t: Translate) {
  return z
    .object({
      currentPassword: z.string().optional(),
      password: z.string().min(8, t('passwordMin')).max(64, t('passwordMax')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t('passwordMismatch'),
      path: ['confirm'],
    });
}

export function createChangePasswordWithCurrentSchema(t: Translate) {
  return z
    .object({
      currentPassword: z.string().min(1, t('currentPasswordRequired')),
      password: z.string().min(8, t('passwordMin')).max(64, t('passwordMax')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t('passwordMismatch'),
      path: ['confirm'],
    });
}

export function createForgotPasswordSchema(t: Translate) {
  return z.object({
    email: z.string().email(t('invalidEmail')),
  });
}

export function createResetPasswordSchema(t: Translate) {
  return z
    .object({
      otp: z
        .string()
        .length(6, t('otpLength'))
        .regex(/^\d+$/, t('otpDigits')),
      password: z.string().min(8, t('passwordMin')).max(64, t('passwordMax')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t('passwordMismatch'),
      path: ['confirm'],
    });
}

export const loginSchema = createLoginSchema(defaultT);
export const sendOtpSchema = createSendOtpSchema(defaultT);
export const verifyOtpSchema = createVerifyOtpSchema(defaultT);
export const setPasswordSchema = createSetPasswordSchema(defaultT);
export const changePasswordSchema = createChangePasswordSchema(defaultT);
export const changePasswordWithCurrentSchema =
  createChangePasswordWithCurrentSchema(defaultT);
export const forgotPasswordSchema = createForgotPasswordSchema(defaultT);
export const resetPasswordSchema = createResetPasswordSchema(defaultT);

export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordWithCurrentInput = z.infer<
  typeof changePasswordWithCurrentSchema
>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Response types ──────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
}

export type LoginResponse =
  | { accessToken: string }
  | { action: 'change_password'; changePasswordToken: string };

export type VerifyOtpResponse =
  | { action: 'logged_in'; accessToken: string }
  | { action: 'setup_password'; setupToken: string }
  | { action: 'change_password'; changePasswordToken: string };

// ─── API functions ───────────────────────────────────────────────────────────

export async function login(data: LoginInput): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
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

export async function changeInitialPassword(
  password: string,
  changePasswordToken: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/change-initial-password', {
    method: 'POST',
    body: { newPassword: password },
    headers: { Authorization: `Bearer ${changePasswordToken}` },
  });
}

export async function changePassword(
  payload: { newPassword: string; currentPassword?: string },
  accessToken?: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/change-password', {
    method: 'POST',
    body: payload,
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/reset-password', {
    method: 'POST',
    body: { email, otp, newPassword },
  });
}

export function isChangePasswordResponse(
  res: LoginResponse,
): res is { action: 'change_password'; changePasswordToken: string } {
  return 'action' in res && res.action === 'change_password';
}
