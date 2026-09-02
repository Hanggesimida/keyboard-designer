'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { getQueryClient } from '@/lib/api/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      // Locale switches remount this client provider. React 19 errors if
      // next-themes' FOUC <script> is rendered on the client; SSR still emits JS.
      scriptProps={
        typeof window === 'undefined'
          ? undefined
          : { type: 'application/json' }
      }
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
