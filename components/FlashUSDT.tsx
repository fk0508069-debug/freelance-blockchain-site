"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { MOCK_USDT_ADDRESS, MOCK_USDT_ABI } from "@/lib/contracts";

export function FlashUSDT() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("1000");
  
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = () => {
    if (!address) return;
    writeContract({
      address: MOCK_USDT_ADDRESS as `0x${string}`,
      abi: MOCK_USDT_ABI,
      functionName: "mint",
      args: [address, parseUnits(amount, 18)],
    });
  };

  if (!isConnected) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-yellow-800">Test Faucet (Flash USDT)</h3>
        <p className="text-xs text-yellow-600">Mint free mock USDT to test the escrow system.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 px-3 py-2 border rounded-md text-sm outline-none"
        />
        <button
          onClick={handleMint}
          disabled={isPending || isConfirming}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-bold disabled:opacity-50"
        >
          {isPending || isConfirming ? "Minting..." : "Mint USDT"}
        </button>
      </div>
      {isSuccess && <p className="text-xs text-green-600 font-bold">Successfully minted!</p>}
      {error && <p className="text-xs text-red-600">Error minting</p>}
    </div>
  );
}