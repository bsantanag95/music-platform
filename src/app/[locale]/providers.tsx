"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OWN_DATA_CHANGED_EVENT, invalidateOwnData } from "@/components/quick-actions/quick-actions-changes";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  // Lo guardado desde "+ Añadir" (Header, fuera de este árbol) llega como evento de `window`.
  useEffect(() => {
    const onChanged = () => invalidateOwnData(queryClient);
    window.addEventListener(OWN_DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(OWN_DATA_CHANGED_EVENT, onChanged);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
