import { request } from './request';

export interface UserFont {
  id: string;
  displayName: string;
  url: string;
  format: string;
  fileSize: number;
  createdAt: string;
}

export function listUserFonts(): Promise<UserFont[]> {
  return request<UserFont[]>('/fonts');
}

export function uploadUserFont(
  file: File,
  displayName?: string,
): Promise<UserFont> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  if (displayName?.trim()) {
    formData.append('displayName', displayName.trim());
  }
  return request<UserFont>('/fonts', {
    method: 'POST',
    body: formData,
  });
}

export function resolveUserFonts(ids: string[]): Promise<UserFont[]> {
  return request<UserFont[]>('/fonts/resolve', {
    method: 'POST',
    body: { ids },
  });
}

export function deleteUserFont(id: string): Promise<void> {
  return request<void>(`/fonts/${id}`, { method: 'DELETE' });
}
