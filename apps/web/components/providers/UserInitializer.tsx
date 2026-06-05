'use client';

import { useEffect } from 'react';
import { useMe } from '@/hooks/queries/users/useUsers';
import { useUserStore } from '@/store/userStore';

export function UserInitializer() {
  const accessToken = useUserStore((s) => s.accessToken);
  const { data: user } = useMe();

  useEffect(() => {
    if (accessToken) {
      console.log('[UserInitializer] 检测到 accessToken，自动获取用户信息');
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) {
      console.log('[UserInitializer] 用户信息已加载:', user.email);
    }
  }, [user]);

  return null;
}
