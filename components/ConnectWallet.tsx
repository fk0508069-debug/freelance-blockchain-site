"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, error } = useConnect(); // Destructure the error
  const { disconnect } = useDisconnect();

  // Add a small UI to display connection errors
  if (error) {
    console.error("Connection error:", error.message);
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full border">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && <span className="text-xs text-red-500 mt-1">{error.message}</span>}
    </div>
  );
}