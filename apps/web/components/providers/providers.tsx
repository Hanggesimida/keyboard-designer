'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/api/queryClient';
import { UserInitializer } from '@/components/providers/UserInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <UserInitializer />
      {children}
    </QueryClientProvider>
  );
}
