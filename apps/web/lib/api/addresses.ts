import { request } from './request';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressPayload {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

// ─── API Functions ───────────────────────────────────────────────────────────

export function listAddresses(): Promise<Address[]> {
  return request<Address[]>('/addresses');
}

export function getAddress(id: string): Promise<Address> {
  return request<Address>(`/addresses/${id}`);
}

export function createAddress(payload: CreateAddressPayload): Promise<Address> {
  return request<Address>('/addresses', { method: 'POST', body: payload });
}

export function updateAddress(id: string, payload: UpdateAddressPayload): Promise<Address> {
  return request<Address>(`/addresses/${id}`, { method: 'PATCH', body: payload });
}

export function deleteAddress(id: string): Promise<void> {
  return request<void>(`/addresses/${id}`, { method: 'DELETE' });
}

export function setDefaultAddress(id: string): Promise<Address> {
  return request<Address>(`/addresses/${id}/default`, { method: 'POST' });
}
