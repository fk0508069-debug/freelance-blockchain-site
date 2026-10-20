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

  // Separate Hooks for Approve
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, error: approveError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Separate Hooks for Deposit
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

    // ✅ FIX: Fetch the seller's actual wallet address
    const sellerWallet = gig.sellerId?.walletAddress;

    if (!sellerWallet) {
      setErrorMsg("This seller has not connected a wallet address yet. You cannot place an order for this gig.");
      return;
    }

    const totalAmount = parseUnits(gig.price.toString(), 18);

    writeDeposit({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "fundOrder",
      // ✅ FIX: Pass the seller's wallet address, not the buyer's address
      args: [BigInt(contractOrderId), sellerWallet, totalAmount],
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

  if (!gig) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#E4E5E7] bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E5E7] border-t-[#1DBF73]" />
          </div>
          <div className="space-y-3">
            <div className="mx-auto h-4 w-40 animate-pulse rounded bg-[#F0F1F2]" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded bg-[#F0F1F2]" />
            <div className="mx-auto h-3 w-48 animate-pulse rounded bg-[#F0F1F2]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.02em] text-[#1DBF73]">
            Secure checkout
          </p>
          <h1 className="text-2xl font-normal tracking-tight text-[#222325] sm:text-3xl">
            Secure Escrow Checkout
          </h1>
          <p className="mt-2 text-sm text-[#62646A]">
            Your funds are protected until you approve the delivery.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm sm:p-8">
          {/* Gig summary */}
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-[#E4E5E7] bg-[#F7F7F7] p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#E4E5E7] bg-white">
              <Image
                src={gig.imageUrl || "https://via.placeholder.com/150"}
                alt={gig.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-[#222325]">
                {gig.title}
              </h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm text-[#62646A]">Total Price:</span>
                <span className="text-base font-semibold text-[#222325]">
                  {gig.price}{" "}
                  <span className="text-sm font-medium text-[#1DBF73]">
                    USDT
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs text-[#62646A]">Seller: {gig.sellerId?.name}</p>
            </div>
          </div>

          {!isConnected ? (
            <div className="rounded-2xl border border-dashed border-[#E4E5E7] bg-[#F7F7F7] p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <svg
                  className="h-5 w-5 text-[#62646A]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm text-[#62646A]">
                Please connect your MetaMask wallet to proceed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1: Approve */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  isApproved
                    ? "border-[#1DBF73]/30 bg-[#E8F8EF]"
                    : "border-[#E4E5E7] bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#222325]">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isApproved
                          ? "bg-[#1DBF73] text-white"
                          : "bg-[#222325] text-white"
                      }`}
                    >
                      {isApproved ? "✓" : "1"}
                    </span>
                    Approve USDT
                  </h3>
                  {isApproved && (
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#1A9F60]">
                      Completed
                    </span>
                  )}
                </div>

                <p className="mb-4 text-sm text-[#62646A]">
                  Allow the Escrow contract to spend {gig.price} USDT.
                </p>

                <button
                  onClick={handleApprove}
                  disabled={isApproved || isApprovePending || isApproveConfirming}
                  className={`flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition ${
                    isApproved
                      ? "cursor-default bg-[#1DBF73]/15 text-[#1A9F60]"
                      : "bg-[#222325] text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  {isApproved
                    ? "Approved"
                    : isApprovePending || isApproveConfirming
                      ? "Approving..."
                      : "Approve USDT"}
                </button>

                {approveError && (
                  <p className="mt-3 rounded-xl bg-[#E02D2D]/10 px-3 py-2 text-xs text-[#E02D2D]">
                    {approveError.message}
                  </p>
                )}
              </div>

              {/* Step 2: Deposit */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  !isApproved
                    ? "border-[#E4E5E7] bg-white opacity-50"
                    : isDepositSuccess
                      ? "border-[#1DBF73]/30 bg-[#E8F8EF]"
                      : "border-[#E4E5E7] bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#222325]">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isDepositSuccess
                          ? "bg-[#1DBF73] text-white"
                          : isApproved
                            ? "bg-[#222325] text-white"
                            : "bg-[#E4E5E7] text-[#9CA0A6]"
                      }`}
                    >
                      {isDepositSuccess ? "✓" : "2"}
                    </span>
                    Deposit to Escrow
                  </h3>
                  {isDepositSuccess && (
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#1A9F60]">
                      Completed
                    </span>
                  )}
                </div>

                <p className="mb-4 text-sm text-[#62646A]">
                  Funds are held securely until you approve the delivery.
                </p>

                <button
                  onClick={handleDeposit}
                  disabled={
                    !isApproved ||
                    isDepositSuccess ||
                    isDepositPending ||
                    isDepositConfirming
                  }
                  className={`flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition ${
                    isDepositSuccess
                      ? "cursor-default bg-[#1DBF73]/15 text-[#1A9F60]"
                      : "bg-[#222325] text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  {isDepositSuccess
                    ? "Deposited"
                    : isDepositPending || isDepositConfirming
                      ? "Depositing..."
                      : "Deposit USDT"}
                </button>

                {depositError && (
                  <p className="mt-3 rounded-xl bg-[#E02D2D]/10 px-3 py-2 text-xs text-[#E02D2D]">
                    {depositError.message}
                  </p>
                )}
              </div>

              {/* Status messages */}
              {isSaving && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E4E5E7] bg-[#F7F7F7] px-4 py-3 text-sm font-semibold text-[#222325]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E4E5E7] border-t-[#1DBF73]" />
                  Verifying transaction &amp; saving order...
                </div>
              )}

              {isDone && (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#E8F8EF] px-4 py-3 text-sm font-semibold text-[#1A9F60]">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Order placed successfully! Redirecting...
                </div>
              )}

              {errorMsg && (
                <div className="rounded-2xl border border-[#E02D2D]/30 bg-[#E02D2D]/10 px-4 py-3 text-center text-sm font-semibold text-[#E02D2D]">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[#9CA0A6]">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Secure Escrow Transaction
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4E5E7] border-t-[#1DBF73]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}