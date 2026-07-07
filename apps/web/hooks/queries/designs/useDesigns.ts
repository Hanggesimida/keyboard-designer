import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDesigns,
  getDesign,
  createDesign,
  updateDesign,
  deleteDesign,
  uploadDesignThumbnail,
  type CreateDesignPayload,
  type UpdateDesignPayload,
} from '@/lib/api/designs';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const designKeys = {
  all: ['designs'] as const,
  lists: () => [...designKeys.all, 'list'] as const,
  detail: (id: string) => [...designKeys.all, 'detail', id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useMyDesigns() {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: designKeys.lists(),
    queryFn: listDesigns,
    enabled: !!accessToken,
  });
}

export function useDesign(id: string | null | undefined) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: designKeys.detail(id!),
    queryFn: () => getDesign(id!),
    enabled: !!accessToken && !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDesignPayload) => createDesign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.lists() });
    },
  });
}

export function useUpdateDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDesignPayload }) =>
      updateDesign(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.lists() });
      queryClient.invalidateQueries({ queryKey: designKeys.detail(data.id) });
    },
  });
}

export function useDeleteDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDesign(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: designKeys.lists() });
      queryClient.removeQueries({ queryKey: designKeys.detail(id) });
    },
  });
}

export function useUploadDesignThumbnail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, blob }: { id: string; blob: Blob }) =>
      uploadDesignThumbnail(id, blob),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: designKeys.lists() });
      queryClient.invalidateQueries({ queryKey: designKeys.detail(id) });
    },
  });
}
