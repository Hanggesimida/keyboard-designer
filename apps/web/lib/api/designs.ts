import { request } from './request';
import type {
  TemplateId,
  Layer,
  GlobalKeycapStyle,
  LayerKeycapOverrides,
  CanvasElement,
} from '@/modules/design/store/designUiStore';
import type { ExportCanvasElement } from '@/modules/design/lib/design/exportArtboard';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * 持久化到后端的设计数据结构。
 * canvasElements 使用内联 src（自包含），而非运行时的 assetId 引用。
 * 该格式与 exportArtboardJson 保持一致，便于互通与迁移。
 */
export interface DesignData {
  version: 1;
  templateId: TemplateId;
  layers: Layer[];
  artboardBackground: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  globalKeycapStyle: GlobalKeycapStyle;
  layerKeycapOverrides: LayerKeycapOverrides;
  /** 内联 src（base64 data URL），自包含，不含 assetId */
  canvasElements: ExportCanvasElement[];
}

// 供 store 构建保存 payload 时使用的运行时类型（含 assetId）
export type { CanvasElement };

export type DesignStatus = 'DRAFT' | 'SUBMITTED' | 'ORDERED';

/** 设计列表摘要（不含 data，用于列表页轻量加载） */
export interface DesignSummary {
  id: string;
  name: string;
  previewUrl: string | null;
  status: DesignStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 完整设计（含 data，用于打开编辑） */
export interface Design extends DesignSummary {
  data: DesignData;
  userId: string;
  user?: { id: string; email: string; name: string | null };
}

export interface CreateDesignPayload {
  name: string;
  data: DesignData;
  previewUrl?: string;
}

export interface UpdateDesignPayload {
  name?: string;
  data?: DesignData;
  previewUrl?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export function listDesigns(): Promise<DesignSummary[]> {
  return request<DesignSummary[]>('/designs');
}

export function getDesign(id: string): Promise<Design> {
  return request<Design>(`/designs/${id}`);
}

export function createDesign(payload: CreateDesignPayload): Promise<Design> {
  return request<Design>('/designs', { method: 'POST', body: payload });
}

export function updateDesign(id: string, payload: UpdateDesignPayload): Promise<Design> {
  return request<Design>(`/designs/${id}`, { method: 'PATCH', body: payload });
}

export function deleteDesign(id: string): Promise<void> {
  return request<void>(`/designs/${id}`, { method: 'DELETE' });
}

/** 提交设计方案，供企业子账号（设计师）向主账号提交审核 */
export function submitDesign(id: string): Promise<DesignSummary> {
  return request<DesignSummary>(`/designs/${id}/submit`, { method: 'PATCH' });
}

export function uploadDesignThumbnail(
  id: string,
  blob: Blob,
): Promise<{ previewUrl: string }> {
  const formData = new FormData();
  formData.append('file', blob, 'thumbnail.webp');
  return request<{ previewUrl: string }>(`/designs/${id}/thumbnail`, {
    method: 'POST',
    body: formData,
  });
}
