"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ConnectWallet } from "@/components/ConnectWallet";
import Image from "next/image";
import { ChatBox } from "@/components/ChatBox";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { MOCK_USDT_ADDRESS, MOCK_USDT_ABI } from "@/lib/contracts";

// --- TYPES ---
interface IGig {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryTime: number;
  imageUrl?: string;
  status: "active" | "paused" | "draft";
  views?: number;
  clicks?: number;
}

interface IOrder {
  _id: string;
  gigId: { title: string; imageUrl?: string };
  buyerId: { name: string; email: string };
  amount: number;
  commission: number;
  status: string;
  escrowTxHash?: string;
  deliveryUrl?: string;
  createdAt: string;
}

// --- CHART HELPERS (inline SVG, no deps) ---
function DonutChart({
  data,
  size = 180,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 60;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[#9CA0A6]">
        No order data yet
      </div>
    );
  }

  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      <circle
        cx="80"
        cy="80"
        r={radius}
        fill="none"
        stroke="#F0F1F2"
        strokeWidth={stroke}
      />
      {data.map((d, i) => {
        const len = (d.value / total) * circumference;
        const el = (
          <circle
            key={i}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function BarChart({
  data,
}: {
  data: { label: string; primary: number; secondary: number }[];
}) {
  const max = Math.max(
    ...data.flatMap((d) => [d.primary, d.secondary]),
    1
  );

  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-[#9CA0A6]">
        No gig performance data yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-52 items-end gap-4">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-full w-full items-end justify-center gap-1.5">
              <div
                className="w-1/2 max-w-[28px] rounded-t-md bg-[#1DBF73] transition-all"
                style={{ height: `${(d.primary / max) * 100}%` }}
                title={`${d.label} — views: ${d.primary}`}
              />
              <div
                className="w-1/2 max-w-[28px] rounded-t-md bg-[#222325] transition-all"
                style={{ height: `${(d.secondary / max) * 100}%` }}
                title={`${d.label} — clicks: ${d.secondary}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] text-[#9CA0A6]" title={d.label}>
              {d.label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs text-[#62646A]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1DBF73]" />
          Views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#222325]" />
          Clicks
        </span>
      </div>
    </div>
  );
}

// Status → theme-aligned badge classes
function statusBadge(status: string) {
  switch (status) {
    case "Completed":
      return "bg-[#E8F8EF] text-[#1A9F60]";
    case "Funded":
      return "bg-[#EEF0F3] text-[#222325]";
    case "In Progress":
      return "bg-[#FFF4E5] text-[#B26A00]";
    case "Submitted":
      return "bg-[#EEF0F3] text-[#222325]";
    case "Revision Requested":
      return "bg-[#E02D2D]/10 text-[#E02D2D]";
    default:
      return "bg-[#F7F7F7] text-[#62646A]";
  }
}

export default function SellerDashboard() {
  const { data: session } = useSession();
  const { address } = useAccount();

  // Fetch real MockUSDT balance from the blockchain
  const { data: usdtBalance, refetch: refetchUsdt } = useReadContract({
    address: MOCK_USDT_ADDRESS,
    abi: MOCK_USDT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // ✅ Local state for instant UI update
  const [displayBalance, setDisplayBalance] = useState("0.00");

  const [activeTab, setActiveTab] = useState("overview");

  // Gig State
  const [gigs, setGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGigId, setEditingGigId] = useState<string | null>(null);

  // Order State
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Chat State
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);

  // Delivery Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Withdraw State
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const {
    data: withdrawHash,
    writeContract: writeWithdraw,
    isPending: isWithdrawPending,
    error: withdrawError,
  } = useWriteContract();
  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawSuccess,
    error: withdrawReceiptError,
  } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Process each confirmed transaction only once.
  const processedWithdrawHash = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "Web Development",
    deliveryTime: "3",
    imageUrl: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // ✅ Sync blockchain balance to local display balance
  useEffect(() => {
    if (usdtBalance !== undefined) {
      setDisplayBalance(
        Number(formatUnits(usdtBalance as bigint, 18)).toFixed(2)
      );
    }
  }, [usdtBalance]);

  // Fetch Data
  const fetchGigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gigs?sellerOnly=true");
      const data = await res.json();
      if (res.ok) setGigs(data.gigs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/orders?role=seller");
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      const data = await res.json();
      if (res.ok) setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGigs();
    fetchOrders();
    fetchConversations();
  }, []);

  // Handle Withdrawal
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = withdrawAmount.trim();
    const destination = withdrawAddress.trim();

    if (!address) {
      setMessage({
        type: "error",
        text: "Connect your wallet before withdrawing.",
      });
      return;
    }

    if (!isAddress(destination)) {
      setMessage({
        type: "error",
        text: "Enter a valid destination wallet address.",
      });
      return;
    }

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setMessage({
        type: "error",
        text: "Enter an amount greater than zero.",
      });
      return;
    }

    if (Number(amount) > Number(displayBalance)) {
      setMessage({
        type: "error",
        text: "Insufficient USDT balance for this withdrawal.",
      });
      return;
    }

    try {
      // This token setup assumes 18 decimals, matching the existing balance read.
      const amountInWei = parseUnits(amount, 18);

      setMessage({ type: "", text: "" });
      writeWithdraw({
        address: MOCK_USDT_ADDRESS,
        abi: MOCK_USDT_ABI,
        functionName: "transfer",
        args: [destination as `0x${string}`, amountInWei],
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to start withdrawal.";
      setMessage({ type: "error", text: errorMessage });
    }
  };

  // Update the UI only after the blockchain receipt confirms success.
  // The blockchain balance remains the source of truth; never subtract twice locally.
  useEffect(() => {
    if (!isWithdrawSuccess || !withdrawHash) return;
    if (processedWithdrawHash.current === withdrawHash) return;

    processedWithdrawHash.current = withdrawHash;
    setMessage({
      type: "success",
      text: "Withdrawal confirmed. Your wallet balance is being refreshed from the blockchain.",
    });
    setWithdrawAmount("");
    setWithdrawAddress("");
    void refetchUsdt();
  }, [isWithdrawSuccess, withdrawHash, refetchUsdt]);

  useEffect(() => {
    const error = withdrawError || withdrawReceiptError;
    if (!error) return;

    setMessage({
      type: "error",
      text:
        error.message ||
        "Withdrawal failed. No successful transfer was confirmed.",
    });
  }, [withdrawError, withdrawReceiptError]);

  const resetForm = () => {
    setEditingGigId(null);
    setShowForm(false);
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "Web Development",
      deliveryTime: "3",
      imageUrl: "",
    });
    setMessage({ type: "", text: "" });
  };

  const handleSubmitGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const isEditing = !!editingGigId;
      const url = isEditing ? `/api/gigs/${editingGigId}` : "/api/gigs";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error ||
            `Failed to ${isEditing ? "update" : "create"} gig`
        );

      setMessage({
        type: "success",
        text: `Gig ${isEditing ? "updated" : "created"} successfully!`,
      });
      resetForm();
      fetchGigs();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (gig: IGig) => {
    setEditingGigId(gig._id);
    setFormData({
      title: gig.title,
      description: gig.description || "",
      price: gig.price.toString(),
      category: gig.category,
      deliveryTime: gig.deliveryTime.toString(),
      imageUrl: gig.imageUrl || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteGig = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this gig? This action cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch(`/api/gigs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGigs(gigs.filter((g) => g._id !== id));
        setMessage({ type: "success", text: "Gig deleted successfully." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/gigs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchGigs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartWork = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "In Progress" }),
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !deliveryUrl) return;
    setIsSubmittingDelivery(true);

    try {
      const res = await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Submitted", deliveryUrl }),
      });
      if (res.ok) {
        setDeliveryModalOpen(false);
        setDeliveryUrl("");
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const openCreateGig = () => {
    resetForm();
    setActiveTab("gigs");
    setShowForm(true);
  };

  const menuItems = [
    {
      id: "overview",
      label: "Overview",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      id: "gigs",
      label: "My Gigs",
      icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    },
    {
      id: "orders",
      label: "Orders",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    },
    {
      id: "messages",
      label: "Messages",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    },
    {
      id: "earnings",
      label: "Earnings & Wallet",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  // --- Derived analytics (computed from existing state) ---
  const activeOrdersCount = orders.filter((o) =>
    ["Funded", "In Progress", "Submitted", "Revision Requested"].includes(
      o.status
    )
  ).length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === "Completed"
  ).length;
  const totalViews = gigs.reduce((acc, g) => acc + (g.views || 0), 0);
  const totalClicks = gigs.reduce((acc, g) => acc + (g.clicks || 0), 0);

  const topGigs = [...gigs]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map((g) => ({
      label: g.title.length > 14 ? g.title.slice(0, 14) + "…" : g.title,
      primary: g.views || 0,
      secondary: g.clicks || 0,
    }));

  const statusBreakdown = [
    {
      label: "Completed",
      value: orders.filter((o) => o.status === "Completed").length,
      color: "#1DBF73",
    },
    {
      label: "In Progress",
      value: orders.filter((o) => o.status === "In Progress").length,
      color: "#222325",
    },
    {
      label: "Submitted",
      value: orders.filter((o) => o.status === "Submitted").length,
      color: "#9CA0A6",
    },
    {
      label: "Revision",
      value: orders.filter((o) => o.status === "Revision Requested").length,
      color: "#B26A00",
    },
    {
      label: "Funded",
      value: orders.filter((o) => o.status === "Funded").length,
      color: "#E4E5E7",
    },
  ].filter((d) => d.value > 0);

  const totalOrderValue = orders
    .filter((o) => o.status === "Completed")
    .reduce((acc, o) => acc + Number(o.amount || 0), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F7] text-[#222325]">
      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#E4E5E7] bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#E4E5E7] px-6">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1DBF73]" />
          <h1 className="text-base font-semibold tracking-tight text-[#222325]">
            Seller Central
          </h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "gigs") resetForm();
                }}
                className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors ${
                  active
                    ? "bg-[#222325] font-semibold text-white"
                    : "font-medium text-[#62646A] hover:bg-[#F7F7F7] hover:text-[#222325]"
                }`}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={item.icon}
                  />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#E4E5E7] p-4">
          <div className="rounded-2xl bg-[#F7F7F7] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
              Available
            </p>
            <p className="mt-1 text-lg font-semibold text-[#222325]">
              {displayBalance}{" "}
              <span className="text-xs font-medium text-[#1DBF73]">USDT</span>
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E4E5E7] bg-white px-5 sm:px-8">
          <h2 className="text-base font-semibold capitalize text-[#222325] sm:text-lg">
            {activeTab}
          </h2>
          <div className="flex items-center gap-3">
            <ConnectWallet />
            <div className="hidden text-sm font-medium text-[#62646A] sm:block">
              Hi, {session?.user?.name}
            </div>
          </div>
        </header>

        {/* MOBILE TABS */}
        <div className="flex gap-2 overflow-x-auto border-b border-[#E4E5E7] bg-white px-4 py-2 md:hidden">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "gigs") resetForm();
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? "bg-[#222325] font-semibold text-white"
                    : "font-medium text-[#62646A] hover:bg-[#F7F7F7]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {/* MESSAGE BANNER */}
          {message.text && (
            <div
              className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ${
                message.type === "success"
                  ? "border-[#1DBF73]/30 bg-[#E8F8EF] text-[#1A9F60]"
                  : "border-[#E02D2D]/30 bg-[#E02D2D]/10 text-[#E02D2D]"
              }`}
            >
              <span>{message.text}</span>
              <button
                onClick={() => setMessage({ type: "", text: "" })}
                className="text-sm font-bold opacity-60 transition hover:opacity-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* CTA banner */}
              <div className="flex flex-col gap-4 rounded-2xl bg-[#222325] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1DBF73]">
                    Ready to earn?
                  </p>
                  <h3 className="mt-2 text-xl font-normal tracking-tight sm:text-2xl">
                    Create a new gig and start getting orders today.
                  </h3>
                </div>
                <button
                  onClick={openCreateGig}
                  className="inline-flex items-center justify-center rounded-full bg-[#1DBF73] px-5 py-3 text-sm font-semibold text-[#222325] transition hover:bg-[#1aad68]"
                >
                  + Create New Gig
                </button>
              </div>

              {/* KPI ROW */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Available balance */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#62646A]">
                      Available Balance
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F8EF] text-[#1A9F60]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"
                        />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-[#222325]">
                      {displayBalance}
                    </span>
                    <span className="text-sm font-medium text-[#1DBF73]">
                      USDT
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#9CA0A6]">
                    Eligible for withdrawal
                  </p>
                </div>

                {/* Active orders */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#62646A]">
                      Active Orders
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F7F7] text-[#62646A]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#222325]">
                    {activeOrdersCount}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA0A6]">
                    Funded, in progress, or submitted
                  </p>
                </div>

                {/* Completed orders */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#62646A]">
                      Completed Orders
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F8EF] text-[#1A9F60]">
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
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#222325]">
                    {completedOrdersCount}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA0A6]">
                    {totalOrderValue > 0
                      ? `${totalOrderValue} USDT earned`
                      : "No earnings yet"}
                  </p>
                </div>

                {/* Impressions */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#62646A]">
                      Total Impressions
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F7F7] text-[#62646A]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                        />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#222325]">
                    {totalViews}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA0A6]">
                    {totalClicks} clicks
                  </p>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Bar chart — gig performance */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#222325]">
                        Gig performance
                      </h3>
                      <p className="mt-1 text-sm text-[#62646A]">
                        Views vs clicks across your top services.
                      </p>
                    </div>
                  </div>
                  <BarChart data={topGigs} />
                </div>

                {/* Donut — order status */}
                <div className="rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-[#222325]">
                    Order status
                  </h3>
                  <p className="mt-1 text-sm text-[#62646A]">
                    Distribution across all orders.
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-4">
                    <div className="relative">
                      <DonutChart data={statusBreakdown} />
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold text-[#222325]">
                          {orders.length}
                        </span>
                        <span className="text-xs text-[#9CA0A6]">
                          orders
                        </span>
                      </div>
                    </div>

                    {statusBreakdown.length > 0 ? (
                      <ul className="w-full space-y-2">
                        {statusBreakdown.map((d) => (
                          <li
                            key={d.label}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="flex items-center gap-2 text-[#62646A]">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: d.color }}
                              />
                              {d.label}
                            </span>
                            <span className="font-semibold text-[#222325]">
                              {d.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#9CA0A6]">
                        Orders will appear here once placed.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECONDARY ROW */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Pending / Locked */}
                <div className="space-y-4 rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-[#62646A]">
                      Pending Clearance
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#222325]">
                      0.00{" "}
                      <span className="text-xs font-medium text-[#1DBF73]">
                        USDT
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[#9CA0A6]">
                      Awaiting buyer approval
                    </p>
                  </div>
                  <div className="border-t border-[#E4E5E7] pt-4">
                    <p className="text-sm font-medium text-[#62646A]">
                      Locked in Escrow
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#222325]">
                      0.00{" "}
                      <span className="text-xs font-medium text-[#1DBF73]">
                        USDT
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[#9CA0A6]">
                      Active orders in progress
                    </p>
                  </div>
                </div>

                {/* Recent orders preview */}
                <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-[#E4E5E7] p-5">
                    <h3 className="text-base font-semibold text-[#222325]">
                      Recent orders
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-sm font-semibold text-[#1DBF73] transition hover:text-[#1aad68]"
                    >
                      View all
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-10 animate-pulse rounded-lg bg-[#F0F1F2]"
                        />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="p-6 text-center text-sm text-[#9CA0A6]">
                      No orders yet. Keep your gigs active to attract buyers.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#E4E5E7]">
                      {orders.slice(0, 4).map((o) => (
                        <li
                          key={o._id}
                          className="flex items-center justify-between gap-3 px-5 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#222325]">
                              {o.gigId?.title || "Unknown Gig"}
                            </p>
                            <p className="mt-0.5 text-xs text-[#62646A]">
                              {o.buyerId?.name || "Unknown Buyer"} ·{" "}
                              {o.amount} USDT
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] ${statusBadge(
                              o.status
                            )}`}
                          >
                            {o.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= MY GIGS TAB ================= */}
          {activeTab === "gigs" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-normal tracking-tight text-[#222325]">
                    My Gigs
                  </h3>
                  <p className="mt-1 text-sm text-[#62646A]">
                    Manage your active, paused, and draft services.
                  </p>
                </div>
                <button
                  onClick={() =>
                    showForm ? resetForm() : setShowForm(true)
                  }
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    showForm
                      ? "border border-[#E4E5E7] bg-white text-[#222325] hover:bg-[#F7F7F7]"
                      : "bg-[#222325] text-white hover:bg-black"
                  }`}
                >
                  {showForm ? "Cancel" : "+ Create New Gig"}
                </button>
              </div>

              {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm duration-200">
                  <h3 className="text-base font-semibold text-[#222325]">
                    {editingGigId ? "Edit Gig" : "Create a New Gig"}
                  </h3>
                  <form onSubmit={handleSubmitGig} className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#222325]">
                          Gig Title
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g., I will build a Next.js website"
                          className="w-full rounded-full border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#222325]">
                          Category
                        </label>
                        <select
                          className="w-full rounded-full border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                        >
                          <option value="Web Development">
                            Web Development
                          </option>
                          <option value="Smart Contracts">
                            Smart Contracts
                          </option>
                          <option value="UI/UX Design">UI/UX Design</option>
                          <option value="Content Writing">
                            Content Writing
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#222325]">
                        Cover Image URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-full border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                        value={formData.imageUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            imageUrl: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#222325]">
                        Description
                      </label>
                      <textarea
                        required
                        placeholder="Describe what you will deliver..."
                        rows={4}
                        className="w-full rounded-2xl border border-[#E4E5E7] bg-white px-4 py-3 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#222325]">
                          Price (USDT)
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          placeholder="50"
                          className="w-full rounded-full border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              price: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#222325]">
                          Delivery Time (Days)
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          placeholder="3"
                          className="w-full rounded-full border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                          value={formData.deliveryTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deliveryTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-full bg-[#222325] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        {isSubmitting
                          ? "Saving..."
                          : editingGigId
                            ? "Save Changes"
                            : "Publish Gig"}
                      </button>
                      {editingGigId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="rounded-full px-4 py-2.5 text-sm font-medium text-[#62646A] transition hover:bg-[#F7F7F7] hover:text-[#222325]"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="border-b border-[#E4E5E7] bg-[#F7F7F7]">
                      <tr>
                        {["Gig", "Status", "Stats", "Price"].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]"
                          >
                            {h}
                          </th>
                        ))}
                        <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E5E7]">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 animate-pulse rounded-lg bg-[#F0F1F2]" />
                                <div className="h-4 w-32 animate-pulse rounded bg-[#F0F1F2]" />
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-6 w-20 animate-pulse rounded-full bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-16 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-16 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                          </tr>
                        ))
                      ) : gigs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-16">
                            <div className="mx-auto max-w-sm text-center">
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F7F7]">
                                <svg
                                  className="h-6 w-6 text-[#62646A]"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.7}
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-[#222325]">
                                No gigs yet
                              </h3>
                              <p className="mt-2 text-sm text-[#62646A]">
                                Create your first gig to start selling.
                              </p>
                              <button
                                onClick={openCreateGig}
                                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#222325] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                              >
                                Create your first gig
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        gigs.map((gig) => (
                          <tr
                            key={gig._id}
                            className="group transition-colors hover:bg-[#F7F7F7]"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F7]">
                                  <Image
                                    src={
                                      gig.imageUrl ||
                                      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=100"
                                    }
                                    alt="Gig"
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="max-w-[220px]">
                                  <p className="truncate text-sm font-semibold text-[#222325]">
                                    {gig.title}
                                  </p>
                                  <p className="mt-1 text-xs text-[#62646A]">
                                    {gig.category}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] ${
                                  gig.status === "active"
                                    ? "bg-[#E8F8EF] text-[#1A9F60]"
                                    : gig.status === "paused"
                                      ? "bg-[#FFF4E5] text-[#B26A00]"
                                      : "bg-[#F7F7F7] text-[#62646A]"
                                }`}
                              >
                                {gig.status || "draft"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5 text-xs text-[#62646A]">
                                <span>{gig.views || 0} views</span>
                                <span>{gig.clicks || 0} clicks</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-[#222325]">
                                {gig.price}{" "}
                                <span className="text-xs font-medium text-[#1DBF73]">
                                  USDT
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-[#9CA0A6]">
                                {gig.deliveryTime} days
                              </p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => handleEditClick(gig)}
                                  className="text-sm font-medium text-[#62646A] transition hover:text-[#222325]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleToggleStatus(gig._id, gig.status)
                                  }
                                  className="text-sm font-medium text-[#1DBF73] transition hover:text-[#1aad68]"
                                >
                                  {gig.status === "active"
                                    ? "Pause"
                                    : "Activate"}
                                </button>
                                <button
                                  onClick={() => handleDeleteGig(gig._id)}
                                  className="text-sm font-medium text-[#E02D2D] transition hover:opacity-70"
                                >
                                  Delete
                                </button>
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
          )}

          {/* ================= ORDERS TAB ================= */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-normal tracking-tight text-[#222325]">
                  My Orders
                </h3>
                <p className="mt-1 text-sm text-[#62646A]">
                  Deliver completed work and manage revisions.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead className="border-b border-[#E4E5E7] bg-[#F7F7F7]">
                      <tr>
                        {["Order / Gig", "Buyer", "Amount", "Status"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]"
                            >
                              {h}
                            </th>
                          )
                        )}
                        <th className="px-5 py-3.5 text-right text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E5E7]">
                      {loadingOrders ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-5 py-4">
                              <div className="h-4 w-40 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-24 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-20 animate-pulse rounded bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-6 w-24 animate-pulse rounded-full bg-[#F0F1F2]" />
                            </td>
                            <td className="px-5 py-4">
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
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.7}
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 7h18M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7"
                                  />
                                </svg>
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-[#222325]">
                                No orders yet
                              </h3>
                              <p className="mt-2 text-sm text-[#62646A]">
                                Keep your gigs active to get new buyers.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr
                            key={order._id}
                            className="transition-colors hover:bg-[#F7F7F7]"
                          >
                            <td className="px-5 py-4 align-top">
                              <p className="font-semibold text-[#222325]">
                                {order.gigId?.title || "Unknown Gig"}
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
                                  View submitted file
                                </a>
                              )}
                              {!order.deliveryUrl && order.escrowTxHash && (
                                <p className="mt-1 font-mono text-xs text-[#9CA0A6]">
                                  TX: {order.escrowTxHash.slice(0, 10)}…
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top text-sm text-[#62646A]">
                              {order.buyerId?.name || "Unknown Buyer"}
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-base font-semibold text-[#222325]">
                                {order.amount}
                              </span>{" "}
                              <span className="text-sm font-medium text-[#1DBF73]">
                                USDT
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] ${statusBadge(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {(order.status === "Funded" ||
                                  order.status === "In Progress") && (
                                  <button
                                    onClick={() => {
                                      setSelectedOrderId(order._id);
                                      setDeliveryModalOpen(true);
                                    }}
                                    className="inline-flex h-9 items-center rounded-full bg-[#222325] px-4 text-sm font-semibold text-white transition hover:bg-black"
                                  >
                                    Work done / Submit
                                  </button>
                                )}
                                {order.status === "Revision Requested" && (
                                  <button
                                    onClick={() => {
                                      setSelectedOrderId(order._id);
                                      setDeliveryModalOpen(true);
                                    }}
                                    className="inline-flex h-9 items-center rounded-full bg-[#222325] px-4 text-sm font-semibold text-white transition hover:bg-black"
                                  >
                                    Submit revision
                                  </button>
                                )}
                                {order.status === "Submitted" && (
                                  <span className="text-sm text-[#62646A]">
                                    Waiting for buyer…
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
                                    Paid
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
          )}

          {/* ================= MESSAGES TAB ================= */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-normal tracking-tight text-[#222325]">
                  Messages
                </h3>
                <p className="mt-1 text-sm text-[#62646A]">
                  Communicate with buyers about active orders and inquiries.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Conversations List */}
                <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm md:col-span-1">
                  <div className="border-b border-[#E4E5E7] bg-[#F7F7F7] p-4 text-sm font-semibold text-[#222325]">
                    Inbox
                  </div>
                  <div className="max-h-[500px] divide-y divide-[#E4E5E7] overflow-y-auto">
                    {conversations.length === 0 ? (
                      <p className="p-4 text-sm text-[#9CA0A6]">
                        No messages yet.
                      </p>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv._id}
                          onClick={() => setSelectedChat(conv)}
                          className={`flex w-full items-start gap-3 border-l-4 p-4 text-left transition ${
                            selectedChat?._id === conv._id
                              ? "border-[#1DBF73] bg-[#E8F8EF]/50"
                              : "border-transparent hover:bg-[#F7F7F7]"
                          }`}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E4E5E7] bg-[#F7F7F7]">
                            {conv.gigImageUrl ? (
                              <Image
                                src={conv.gigImageUrl}
                                alt="Gig"
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-[#9CA0A6]">
                                IMG
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-[#222325]">
                                {conv.otherUserName}
                              </p>
                              <span className="whitespace-nowrap text-[10px] text-[#9CA0A6]">
                                {new Date(
                                  conv.updatedAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-medium text-[#1DBF73]">
                              {conv.gigTitle}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#62646A]">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="md:col-span-2">
                  {selectedChat ? (
                    <ChatBox
                      orderId={selectedChat.orderId || undefined}
                      gigId={selectedChat.gigId || undefined}
                      receiverId={selectedChat.otherUserId}
                      receiverName={selectedChat.otherUserName}
                      gigTitle={selectedChat.gigTitle}
                      gigImageUrl={selectedChat.gigImageUrl}
                    />
                  ) : (
                    <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E4E5E7] bg-white text-[#9CA0A6]">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <p className="text-sm">
                        Select a conversation to start chatting
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= EARNINGS & WALLET TAB ================= */}
          {activeTab === "earnings" && (
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Hero */}
              <div className="overflow-hidden rounded-2xl bg-[#222325] p-6 text-white shadow-sm sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1DBF73]">
                      Seller wallet
                    </p>
                    <h3 className="mt-2 text-2xl font-normal tracking-tight sm:text-3xl">
                      Earnings &amp; Wallet
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                      Check your on-chain MockUSDT balance and transfer tokens
                      to another wallet.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                    $
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Live wallet balance */}
                <section className="relative overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm sm:p-8">
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#62646A]">
                        Live wallet balance
                      </p>
                      <span className="rounded-full bg-[#E8F8EF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#1A9F60]">
                        On-chain
                      </span>
                    </div>
                    <div className="mt-5 flex items-end gap-2">
                      <h4 className="text-4xl font-semibold tracking-tight text-[#222325] sm:text-5xl">
                        {displayBalance}
                      </h4>
                      <span className="pb-1.5 text-sm font-medium text-[#1DBF73]">
                        USDT
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#62646A]">
                      This amount is read from the token contract for your
                      connected wallet.
                    </p>

                    <div className="mt-6 rounded-2xl border border-[#E4E5E7] bg-[#F7F7F7] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                        Connected wallet
                      </p>
                      {address ? (
                        <p className="mt-2 break-all font-mono text-sm text-[#222325]">
                          {address}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-[#B26A00]">
                          Connect MetaMask to view your wallet balance.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void refetchUsdt()}
                      disabled={!address}
                      className="mt-5 inline-flex items-center justify-center rounded-full border border-[#E4E5E7] bg-white px-5 py-2.5 text-sm font-semibold text-[#222325] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Refresh balance
                    </button>
                  </div>
                </section>

                {/* Withdrawal form */}
                <section className="rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7] text-lg text-[#222325]">
                        ↗
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#222325]">
                          Withdraw MockUSDT
                        </h3>
                        <p className="mt-0.5 text-sm text-[#62646A]">
                          Send tokens to a destination address.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-5">
                    <div>
                      <label
                        htmlFor="withdraw-address"
                        className="mb-2 block text-sm font-semibold text-[#222325]"
                      >
                        Destination address
                      </label>
                      <input
                        id="withdraw-address"
                        required
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="0x..."
                        className="w-full rounded-2xl border border-[#E4E5E7] bg-white px-4 py-3 font-mono text-sm text-[#222325] placeholder-[#9CA0A6] outline-none transition focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                      />
                      <p className="mt-2 text-xs text-[#9CA0A6]">
                        Double-check the address and network before confirming
                        in MetaMask.
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor="withdraw-amount"
                          className="block text-sm font-semibold text-[#222325]"
                        >
                          Amount (USDT)
                        </label>
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(displayBalance)}
                          disabled={
                            !address ||
                            Number(displayBalance) <= 0 ||
                            isWithdrawPending ||
                            isWithdrawConfirming
                          }
                          className="text-xs font-semibold uppercase tracking-[0.02em] text-[#1DBF73] transition hover:text-[#1aad68] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Use max
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="withdraw-amount"
                          required
                          type="number"
                          min="0.01"
                          max={displayBalance}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-full rounded-2xl border border-[#E4E5E7] bg-white px-4 py-3 pr-20 text-lg font-semibold text-[#222325] placeholder-[#9CA0A6] outline-none transition focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1DBF73]">
                          USDT
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#9CA0A6]">
                        <span>Available: {displayBalance} USDT</span>
                        <span>Network fees may apply</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !address ||
                        isWithdrawPending ||
                        isWithdrawConfirming ||
                        !withdrawAddress ||
                        !withdrawAmount
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#222325] px-5 py-3.5 font-semibold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#1DBF73]/30 disabled:cursor-not-allowed disabled:bg-[#9CA0A6]"
                    >
                      {isWithdrawPending
                        ? "Waiting for MetaMask..."
                        : isWithdrawConfirming
                          ? "Confirming on blockchain..."
                          : "Withdraw USDT"}
                    </button>

                    <p className="text-xs leading-5 text-[#9CA0A6]">
                      Your displayed balance updates from the token contract
                      after the transaction is confirmed. Never share your
                      recovery phrase or private key.
                    </p>
                  </form>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DELIVERY MODAL */}
      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#222325]">
              Submit Delivery
            </h3>
            <p className="mt-1 text-sm text-[#62646A]">
              Paste a link where the buyer can access your work.
            </p>

            <form onSubmit={handleSubmitDelivery} className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-[#222325]">
                Delivery link (Google Drive, Dropbox, IPFS)
              </label>
              <input
                required
                type="url"
                placeholder="https://drive.google.com/..."
                className="w-full rounded-2xl border border-[#E4E5E7] bg-white px-4 py-2.5 text-sm text-[#222325] placeholder-[#9CA0A6] outline-none focus:border-[#1DBF73] focus:ring-2 focus:ring-[#1DBF73]/20"
                value={deliveryUrl}
                onChange={(e) => setDeliveryUrl(e.target.value)}
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryModalOpen(false)}
                  className="rounded-full border border-[#E4E5E7] bg-white px-5 py-2.5 text-sm font-semibold text-[#222325] transition hover:bg-[#F7F7F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelivery}
                  className="rounded-full bg-[#222325] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                >
                  {isSubmittingDelivery ? "Submitting..." : "Send to Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}