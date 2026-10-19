"use client";

import { ReactNode, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia, polygonAmoy } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask } from "wagmi/connectors";

const config = createConfig({
  chains: [sepolia, polygonAmoy],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  // The QueryClient must be created inside a useState to prevent re-creation
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      {/* QueryClientProvider MUST be on the outside of WagmiProvider */}
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}