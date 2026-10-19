"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { MOCK_USDT_ADDRESS, MOCK_USDT_ABI, ESCROW_ADDRESS, ESCROW_ABI } from "@/lib/contracts";
import Image from "next/image";

function CheckoutContent() {
  const { gigId } = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [gig, setGig] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // State for tracking steps
  const [isApproved, setIsApproved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Generate a random uint256 for the smart contract Order ID
  const [contractOrderId] = useState(() => Math.floor(Math.random() * 1000000000));

  useEffect(() => {
    fetch(`/api/gigs/${gigId}`)
      .then((res) => res.json())
      .then((data) => setGig(data.gig));
  }, [gigId]);

  // ✅ Separate Hooks for Approve
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, error: approveError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // ✅ Separate Hooks for Deposit
  const { data: depositHash, writeContract: writeDeposit, isPending: isDepositPending, error: depositError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  // Step 1: Approve USDT
  const handleApprove = () => {
    if (!gig) return;
    setErrorMsg("");
    const totalAmount = parseUnits(gig.price.toString(), 18);
    
    writeApprove({
      address: MOCK_USDT_ADDRESS,
      abi: MOCK_USDT_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, totalAmount],
    });
  };

  // Step 2: Fund Escrow
  const handleDeposit = () => {
    if (!gig || !address) return;
    setErrorMsg("");
    const totalAmount = parseUnits(gig.price.toString(), 18);

    writeDeposit({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "fundOrder",
      args: [BigInt(contractOrderId), address, totalAmount],
    });
  };

  // Watch Approve Success
  useEffect(() => {
    if (isApproveSuccess) {
      setIsApproved(true);
    }
  }, [isApproveSuccess]);

  // Watch Deposit Success
  useEffect(() => {
    if (isDepositSuccess && depositHash) {
      setIsSaving(true);
      
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId,
          amount: gig.price,
          escrowTxHash: depositHash,
          contractOrderId: contractOrderId,
        }),
      })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save order to database");
        }
        setIsDone(true);
        setTimeout(() => router.push("/dashboard/buyer"), 2000);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(`Database Error: ${err.message}`);
        setIsSaving(false);
      });
    }
  }, [isDepositSuccess, depositHash, gigId, gig, contractOrderId, router]);

  if (!gig) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Secure Escrow Checkout</h1>

        <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 mb-8">
          <div className="w-20 h-20 relative rounded-lg overflow-hidden shrink-0">
            <Image src={gig.imageUrl || "https://via.placeholder.com/150"} alt={gig.title} fill className="object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{gig.title}</h3>
            <p className="text-sm text-gray-500">Total Price: <span className="font-bold text-green-600">${gig.price} USDT</span></p>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center p-6 border-2 border-dashed rounded-xl">
            <p className="text-gray-500 mb-4">Please connect your MetaMask wallet to proceed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Step 1: Approve */}
            <div className={`p-4 border rounded-xl transition-all ${
              isApproved ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50"
            }`}>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Step 1: Approve USDT 
                {isApproved && <span className="text-green-600 text-sm">✔ Completed</span>}
              </h3>
              <p className="text-sm text-gray-600 mb-4">Allow the Escrow contract to spend ${gig.price} USDT.</p>
              <button
                onClick={handleApprove}
                disabled={isApproved || isApprovePending || isApproveConfirming}
                className={`w-full py-2 rounded-lg font-bold text-white transition ${
                  isApproved ? "bg-green-500 cursor-default" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                }`}
              >
                {isApproved ? "Approved" : isApprovePending || isApproveConfirming ? "Approving..." : "Approve USDT"}
              </button>
              {approveError && <p className="text-red-500 text-xs mt-2">{approveError.message}</p>}
            </div>

            {/* Step 2: Deposit */}
            <div className={`p-4 border rounded-xl transition-all ${
              !isApproved ? "opacity-50" : isDepositSuccess ? "border-green-500 bg-green-50" : "border-blue-500"
            }`}>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Step 2: Deposit to Escrow
                {isDepositSuccess && <span className="text-green-600 text-sm">✔ Completed</span>}
              </h3>
              <p className="text-sm text-gray-600 mb-4">Funds are held securely until you approve the delivery.</p>
              <button
                onClick={handleDeposit}
                disabled={!isApproved || isDepositSuccess || isDepositPending || isDepositConfirming}
                className={`w-full py-2 rounded-lg font-bold text-white transition ${
                  isDepositSuccess ? "bg-green-500 cursor-default" : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                }`}
              >
                {isDepositSuccess ? "Deposited" : isDepositPending || isDepositConfirming ? "Depositing..." : "Deposit USDT"}
              </button>
              {depositError && <p className="text-red-500 text-xs mt-2">{depositError.message}</p>}
            </div>

            {/* Status Messages */}
            {isSaving && <p className="text-center text-blue-600 font-bold animate-pulse">Verifying Transaction & Saving Order...</p>}
            {isDone && <p className="text-center text-green-600 font-bold">Order Placed Successfully! Redirecting...</p>}
            
            {errorMsg && <p className="text-center text-red-500 text-sm mt-4 font-bold">{errorMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}