"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem"; // ✅ Added for error handling
import { ESCROW_ADDRESS, ESCROW_ABI } from "@/lib/contracts";
import { ConnectWallet } from "@/components/ConnectWallet";
import Link from "next/link";

export default function BuyerDashboard() {
  const { isConnected } = useAccount();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders?role=buyer");
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRequestRevision = async (orderId: string) => {
    if (!confirm("Are you sure you want to request a revision?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Revision Requested" }),
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = (orderId: string, contractOrderId: number) => {
    setReleasingId(orderId);
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "releaseFunds",
      args: [BigInt(contractOrderId)],
    });
  };

  // 1. When smart contract succeeds, update DB status to Completed
  useEffect(() => {
    if (isSuccess && releasingId && hash) {
      fetch(`/api/orders/${releasingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed", releaseTxHash: hash }),
      }).then(() => {
        alert("Funds released to seller successfully!");
        setReleasingId(null);
        fetchOrders();
      });
    }
  }, [isSuccess, hash, releasingId]);

  // 2. Robust Error Handling for MetaMask / Smart Contract Reverts
  useEffect(() => {
    if (writeError) {
      const error = writeError as BaseError;

      // Walk the error chain to find the specific contract revert reason
      const revertError = error.walk((err) => err instanceof ContractFunctionRevertedError);

      if (revertError instanceof ContractFunctionRevertedError) {
        const reason = revertError.reason || "";

        // If the blockchain says it's already done, sync the database automatically
        if (reason.includes("Order already completed")) {
          alert("The funds have already been released on the blockchain. Syncing your dashboard...");

          if (releasingId) {
            fetch(`/api/orders/${releasingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "Completed" }),
            }).then(() => {
              setReleasingId(null);
              fetchOrders(); // Refresh the table
            });
          }
          return; // Exit early, we handled the sync
        }
      }

      // Fallback for other errors (e.g., user clicked "Reject" in MetaMask)
      alert(`Transaction failed: ${error.shortMessage || error.message}`);
      setReleasingId(null);
    }
  }, [writeError, releasingId]);

  // Theme-aligned status badge styling
  const statusStyles = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-[#EEF0F3] text-[#222325]";
      case "Completed":
        return "bg-[#E8F8EF] text-[#1A9F60]";
      case "Revision Requested":
        return "bg-[#FFF4E5] text-[#B26A00]";
      default:
        return "bg-[#F7F7F7] text-[#62646A]";
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#1DBF73]">
              BUYER DASHBOARD
            </p>
            <h1 className="text-3xl font-normal tracking-tight text-[#222325] sm:text-4xl">
              Your orders
            </h1>
            <p className="mt-2 text-sm text-[#62646A]">
              Review delivered work and manage escrow payments.
            </p>
          </div>

          <div className="shrink-0">
            <ConnectWallet />
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="border-b border-[#E4E5E7] bg-[#F7F7F7]">
                <tr>
                  {["Order info", "Seller", "Amount", "Status"].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E4E5E7]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-5">
                        <div className="h-4 w-40 animate-pulse rounded bg-[#F0F1F2]" />
                        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[#F0F1F2]" />
                      </td>
                      <td className="px-5 py-5">
                        <div className="h-4 w-24 animate-pulse rounded bg-[#F0F1F2]" />
                      </td>
                      <td className="px-5 py-5">
                        <div className="h-4 w-20 animate-pulse rounded bg-[#F0F1F2]" />
                      </td>
                      <td className="px-5 py-5">
                        <div className="h-6 w-24 animate-pulse rounded-full bg-[#F0F1F2]" />
                      </td>
                      <td className="px-5 py-5">
                        <div className="ml-auto h-9 w-32 animate-pulse rounded-full bg-[#F0F1F2]" />
                      </td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16">
                      <div className="mx-auto max-w-sm text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F7F7]">
                          <svg
                            className="h-6 w-6 text-[#62646A]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 7h18M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
                          </svg>
                        </div>

                        <h3 className="mt-4 text-lg font-semibold text-[#222325]">
                          No orders yet
                        </h3>
                        <p className="mt-2 text-sm text-[#62646A]">
                          When you place an order, it will appear here for you to
                          review and release payment.
                        </p>

                        <Link
                          href="/"
                          className="mt-5 inline-flex items-center justify-center rounded-full bg-[#222325] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                        >
                          Browse gigs
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order._id}
                      className="transition-colors hover:bg-[#F7F7F7]"
                    >
                      {/* Order info */}
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[#222325]">
                          {order.gigId?.title}
                        </p>
                        {order.deliveryUrl && (
                          <a
                            href={order.deliveryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#E4E5E7] bg-white px-3 py-1 text-xs font-semibold text-[#222325] transition hover:bg-[#F7F7F7]"
                          >
                            <svg
                              className="h-3.5 w-3.5 text-[#62646A]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                              />
                            </svg>
                            View delivered file
                          </a>
                        )}
                      </td>

                      {/* Seller */}
                      <td className="px-5 py-4 align-top text-sm text-[#62646A]">
                        {order.sellerId?.name}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 align-top">
                        <span className="text-base font-semibold text-[#222325]">
                          {order.amount}
                        </span>{" "}
                        <span className="text-sm font-medium text-[#1DBF73]">
                          USDT
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.02em] ${statusStyles(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/* If Seller has submitted the work */}
                          {order.status === "Submitted" && (
                            <>
                              <button
                                onClick={() => handleRequestRevision(order._id)}
                                className="inline-flex h-9 items-center rounded-full border border-[#E4E5E7] bg-white px-4 text-sm font-semibold text-[#222325] transition hover:bg-[#F7F7F7]"
                              >
                                Request revision
                              </button>
                              <button
                                onClick={() =>
                                  handleRelease(order._id, order.contractOrderId)
                                }
                                disabled={
                                  isPending ||
                                  isConfirming ||
                                  releasingId === order._id
                                }
                                className="inline-flex h-9 items-center rounded-full bg-[#222325] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {releasingId === order._id
                                  ? "Releasing..."
                                  : "Approve & release"}
                              </button>
                            </>
                          )}

                          {/* If funds are just locked but no work submitted yet */}
                          {order.status === "Funded" && (
                            <span className="text-sm text-[#62646A]">
                              Seller is working…
                            </span>
                          )}

                          {order.status === "Revision Requested" && (
                            <span className="text-sm font-medium text-[#B26A00]">
                              Waiting for seller revision…
                            </span>
                          )}

                          {order.status === "Completed" && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A9F60]">
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
                              Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}