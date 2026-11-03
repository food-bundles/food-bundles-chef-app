import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface KitchenCreateBody {
  name: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string;
  timezone?: string;
}

export interface KitchenUpdateBody {
  name?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string | null;
  timezone?: string | null;
}

export interface KitchenDto {
  id: string;
  chef_id: string;
  name: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function listKitchens(): Promise<KitchenDto[]> {
  return request<KitchenDto[]>('/kitchens');
}

export function getKitchen(kitchenId: string): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}`);
}

export function createKitchen(body: KitchenCreateBody): Promise<KitchenDto> {
  return request<KitchenDto>('/kitchens', { method: 'POST', body });
}

export function updateKitchen(kitchenId: string, body: KitchenUpdateBody): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}`, { method: 'PATCH', body });
}

export function archiveKitchen(kitchenId: string): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}/archive`, { method: 'POST' });
}
