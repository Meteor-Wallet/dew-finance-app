import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: (query) => {
        const updatedAt = query.state.dataUpdatedAt;
        if (!updatedAt) return false;
        return Date.now() - updatedAt > 10 * 60 * 1000;
      },
    },
  },
});
