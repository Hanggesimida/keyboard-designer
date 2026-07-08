import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listUserFonts,
  uploadUserFont,
  deleteUserFont,
  resolveUserFonts,
  type UserFont,
} from '@/lib/api/fonts';
import { loadUserFonts } from '@/lib/fonts/loadUserFonts';
import { useUserStore } from '@/store/userStore';

export const fontKeys = {
  all: ['fonts'] as const,
  list: () => [...fontKeys.all, 'list'] as const,
};

/** 解析并注入 FontFace（打开含软删字体的设计时用） */
export async function resolveAndCacheUserFonts(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const fonts = await resolveUserFonts(unique);
  await loadUserFonts(fonts.map((f) => ({ id: f.id, url: f.url })));
}

export function useUserFonts() {
  const accessToken = useUserStore((s) => s.accessToken);

  const query = useQuery({
    queryKey: fontKeys.list(),
    queryFn: listUserFonts,
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (query.data) {
      void loadUserFonts(query.data.map((f) => ({ id: f.id, url: f.url })));
    }
  }, [query.data]);

  return query;
}

export function useUploadUserFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, displayName }: { file: File; displayName?: string }) =>
      uploadUserFont(file, displayName),
    onSuccess: async (font: UserFont) => {
      await loadUserFonts([{ id: font.id, url: font.url }]);
      queryClient.invalidateQueries({ queryKey: fontKeys.list() });
    },
  });
}

export function useDeleteUserFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUserFont(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fontKeys.list() });
    },
  });
}
