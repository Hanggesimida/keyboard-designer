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

/** 导出 / 治具生成读取的最新用户字体 map（由 useUserFonts / resolve 维护） */
let cachedUserFontAssets: Record<string, { url: string }> = {};

export function getCachedUserFontAssets(): Record<string, { url: string }> {
  return cachedUserFontAssets;
}

function mergeFontAssetsCache(fonts: UserFont[]) {
  const next = { ...cachedUserFontAssets };
  for (const f of fonts) {
    next[`uf:${f.id}`] = { url: f.url };
  }
  cachedUserFontAssets = next;
}

export function buildUserFontAssetsMap(
  fonts: UserFont[] | undefined,
): Record<string, { url: string }> {
  const map: Record<string, { url: string }> = {};
  if (!fonts) return map;
  for (const f of fonts) {
    map[`uf:${f.id}`] = { url: f.url };
  }
  return map;
}

/** 解析并缓存指定 UserFont id（用于打开含软删/他人字体的设计） */
export async function resolveAndCacheUserFonts(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const fonts = await resolveUserFonts(unique);
  mergeFontAssetsCache(fonts);
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
      cachedUserFontAssets = {
        ...cachedUserFontAssets,
        ...buildUserFontAssetsMap(query.data),
      };
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
      mergeFontAssetsCache([font]);
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
