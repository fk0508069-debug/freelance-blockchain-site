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
    if(!confirm("Are you sure you want to request a revision?")) return;
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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Dashboard</h1>
          <p className="text-gray-600">Review delivered work and manage escrow payments.</p>
        </div>
        <ConnectWallet />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Order Info</th>
              <th className="p-4 font-medium text-gray-600">Seller</th>
              <th className="p-4 font-medium text-gray-600">Amount</th>
              <th className="p-4 font-medium text-gray-600">Status</th>
              <th className="p-4 font-medium text-gray-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-500">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-500">No orders found. <Link href="/" className="text-blue-600 hover:underline">Browse Gigs</Link></td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-900">{order.gigId?.title}</p>
                    {order.deliveryUrl && (
                      <a href={order.deliveryUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-200 hover:bg-blue-100 transition-colors">
                        📁 View Delivered File
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-gray-700">{order.sellerId?.name}</td>
                  <td className="p-4 font-bold text-gray-900">${order.amount} USDT</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      order.status === 'Submitted' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'Revision Requested' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {/* If Seller has submitted the work */}
                    {order.status === "Submitted" && (
                      <>
                        <button
                          onClick={() => handleRequestRevision(order._id)}
                          className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-md text-sm font-medium transition"
                        >
                          Request Revision
                        </button>
                        <button
                          onClick={() => handleRelease(order._id, order.contractOrderId)}
                          disabled={isPending || isConfirming || releasingId === order._id}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition disabled:opacity-50"
                        >
                          {releasingId === order._id ? "Releasing..." : "Approve & Release"}
                        </button>
                      </>
                    )}
                    {/* If funds are just locked but no work submitted yet */}
                    {order.status === "Funded" && <span className="text-sm text-gray-500">Seller is working...</span>}
                    {order.status === "Revision Requested" && <span className="text-sm text-orange-500 font-medium">Waiting for seller revision...</span>}
                    {order.status === "Completed" && <span className="text-sm text-green-600 font-bold">Completed ✔</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}