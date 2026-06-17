import { QueryClient } from '@tanstack/react-query';

/** Configured once and shared by the app and the mutation files (for invalidation). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});
