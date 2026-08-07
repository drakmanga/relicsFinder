import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrokinProvider } from "relic-finder-ui";

import "relic-finder-ui/styles.css";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The relic dataset is static and the market is rate-limited; refetching
      // on every window focus would burn requests for data that has not moved.
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // A 4xx will not become a 2xx by asking again.
        const status = (error as { status?: number })?.status;
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

const container = document.getElementById("root");
if (!container) throw new Error("#root non trovato in index.html");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <OrokinProvider fullHeight>
        <App />
      </OrokinProvider>
    </QueryClientProvider>
  </StrictMode>,
);
