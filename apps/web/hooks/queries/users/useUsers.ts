import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/users';
import { useUserStore } from '@/store/userStore';

export const userKeys = {
  me: ['users', 'me'] as const,
  meWithToken: (token: string | null) => ['users', 'me', token] as const,
};

export function useMe() {
  const accessToken = useUserStore((s) => s.accessToken);
  const setUser = useUserStore((s) => s.setUser);

  const query = useQuery({
    queryKey: userKeys.meWithToken(accessToken),
    queryFn: getMe,
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}
