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
  useWaitForTransactionReceipt 
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
    imageUrl: "" 
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // ✅ Sync blockchain balance to local display balance
  useEffect(() => {
    if (usdtBalance !== undefined) {
      setDisplayBalance(Number(formatUnits(usdtBalance as bigint, 18)).toFixed(2));
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
      setMessage({ type: "error", text: "Connect your wallet before withdrawing." });
      return;
    }

    if (!isAddress(destination)) {
      setMessage({ type: "error", text: "Enter a valid destination wallet address." });
      return;
    }

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setMessage({ type: "error", text: "Enter an amount greater than zero." });
      return;
    }

    if (Number(amount) > Number(displayBalance)) {
      setMessage({ type: "error", text: "Insufficient USDT balance for this withdrawal." });
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
      const errorMessage = err instanceof Error ? err.message : "Unable to start withdrawal.";
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
      text: error.message || "Withdrawal failed. No successful transfer was confirmed.",
    });
  }, [withdrawError, withdrawReceiptError]);

  const resetForm = () => {
    setEditingGigId(null);
    setShowForm(false);
    setFormData({ title: "", description: "", price: "", category: "Web Development", deliveryTime: "3", imageUrl: "" });
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
      if (!res.ok) throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} gig`);
      
      setMessage({ type: "success", text: `Gig ${isEditing ? 'updated' : 'created'} successfully!` });
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
      imageUrl: gig.imageUrl || ""
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteGig = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gig? This action cannot be undone.")) return;
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
    { id: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "gigs", label: "My Gigs", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { id: "orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { id: "messages", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { id: "earnings", label: "Earnings & Wallet", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-6">
          <h1 className="text-xl font-bold text-blue-600">Seller Central</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if(item.id !== "gigs") resetForm();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm sm:px-8">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <ConnectWallet />
            <div className="text-sm font-medium text-gray-700">Hi, {session?.user?.name}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {message.text && (
            <div className={`p-4 mb-6 rounded-md flex justify-between items-center ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: "", text: "" })} className="text-sm font-bold opacity-50 hover:opacity-100">✕</button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-blue-600 p-6 rounded-xl text-white shadow-sm">
                <div>
                  <h3 className="text-lg font-bold">Ready to earn?</h3>
                  <p className="text-blue-100 text-sm">Create a new gig and start getting orders today.</p>
                </div>
                <button onClick={openCreateGig} className="bg-white text-blue-600 hover:bg-gray-50 px-5 py-2.5 rounded-lg font-bold transition shadow-sm">
                  + Create New Gig
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm border-green-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Available Balance</p>
                  <h3 className="text-3xl font-bold text-gray-900">${displayBalance} <span className="text-sm text-gray-400 font-normal">USDT</span></h3>
                  <p className="text-xs text-gray-400 mt-2">Eligible for withdrawal</p>
                </div>  
                <div className="bg-white p-6 rounded-xl border shadow-sm border-yellow-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Pending Clearance</p>
                  <h3 className="text-3xl font-bold text-gray-900">$0.00 <span className="text-sm text-gray-400 font-normal">USDT</span></h3>
                  <p className="text-xs text-gray-400 mt-2">Awaiting buyer approval</p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm border-blue-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Locked in Escrow</p>
                  <h3 className="text-3xl font-bold text-gray-900">$0.00 <span className="text-sm text-gray-400 font-normal">USDT</span></h3>
                  <p className="text-xs text-gray-400 mt-2">Active orders in progress</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <p className="text-sm text-gray-500">Active Orders</p>
                  <h3 className="text-2xl font-bold">{orders.filter(o => ["Funded", "In Progress", "Submitted", "Revision Requested"].includes(o.status)).length}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <p className="text-sm text-gray-500">Completed Orders</p>
                  <h3 className="text-2xl font-bold">{orders.filter(o => o.status === "Completed").length}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <p className="text-sm text-gray-500">Total Impressions</p>
                  <h3 className="text-2xl font-bold text-blue-600">{gigs.reduce((acc, g) => acc + (g.views || 0), 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <p className="text-sm text-gray-500">Total Clicks</p>
                  <h3 className="text-2xl font-bold text-blue-600">{gigs.reduce((acc, g) => acc + (g.clicks || 0), 0)}</h3>
                </div>
              </div>
            </div>
          )}

          {/* MY GIGS TAB */}
          {activeTab === "gigs" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">My Gigs</h3>
                  <p className="text-sm text-gray-500">Manage your active, paused, and draft services.</p>
                </div>
                <button onClick={() => showForm ? resetForm() : setShowForm(true)} className={`px-4 py-2 rounded-md font-medium transition ${showForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                  {showForm ? "Cancel" : "+ Create New Gig"}
                </button>
              </div>

              {showForm && (
                <div className="bg-white p-6 rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                  <h3 className="text-lg font-bold mb-4">{editingGigId ? "Edit Gig" : "Create a New Gig"}</h3>
                  <form onSubmit={handleSubmitGig} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gig Title</label>
                        <input required type="text" placeholder="e.g., I will build a Next.js website" className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                          value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                          <option value="Web Development">Web Development</option>
                          <option value="Smart Contracts">Smart Contracts</option>
                          <option value="UI/UX Design">UI/UX Design</option>
                          <option value="Content Writing">Content Writing</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                      <input type="url" placeholder="https://example.com/image.jpg" className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea required placeholder="Describe what you will deliver..." rows={4} className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (USDT)</label>
                        <input required type="number" min="1" step="1" placeholder="50" className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time (Days)</label>
                        <input required type="number" min="1" placeholder="3" className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.deliveryTime} onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-md font-medium transition disabled:opacity-50">
                        {isSubmitting ? "Saving..." : editingGigId ? "Save Changes" : "Publish Gig"}
                      </button>
                      {editingGigId && (
                        <button type="button" onClick={resetForm} className="text-gray-600 hover:text-gray-900 px-4 py-2.5 font-medium">
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 font-medium text-gray-600 text-sm">Gig</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Status</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Stats</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Price</th>
                      <th className="p-4 font-medium text-gray-600 text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={5} className="p-12 text-center text-gray-500"><div className="flex justify-center items-center gap-2"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>Loading gigs...</div></td></tr>
                    ) : gigs.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-gray-500"><p className="mb-2">You haven't created any gigs yet.</p><button onClick={openCreateGig} className="text-blue-600 font-medium hover:underline">Create your first gig</button></td></tr>
                    ) : (
                      gigs.map((gig) => (
                        <tr key={gig._id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-4 flex items-center gap-4">
                            <div className="w-14 h-14 relative rounded-lg overflow-hidden bg-gray-100 shrink-0 border">
                              <Image src={gig.imageUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=100"} alt="Gig" fill sizes="56px" className="object-cover" />
                            </div>
                            <div className="max-w-[200px]">
                              <p className="font-semibold text-gray-900 truncate">{gig.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{gig.category}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${gig.status === 'active' ? 'bg-green-100 text-green-700' : gig.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                              {(gig.status || "draft").toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-xs text-gray-500 flex flex-col gap-1">
                              <span>{gig.views || 0} Views</span>
                              <span>{gig.clicks || 0} Clicks</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-gray-900">${gig.price}</span>
                            <span className="text-xs text-gray-400 block">{gig.deliveryTime} Days</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(gig)} className="text-sm font-medium text-gray-600 hover:text-gray-900">Edit</button>
                              <button onClick={() => handleToggleStatus(gig._id, gig.status)} className="text-sm font-medium text-blue-600 hover:text-blue-800">{gig.status === 'active' ? 'Pause' : 'Activate'}</button>
                              <button onClick={() => handleDeleteGig(gig._id)} className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">My Orders</h3>
                <p className="text-sm text-gray-500">Deliver completed work and manage revisions.</p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 font-medium text-gray-600 text-sm">Order / Gig</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Buyer</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Amount</th>
                      <th className="p-4 font-medium text-gray-600 text-sm">Status</th>
                      <th className="p-4 font-medium text-gray-600 text-sm text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingOrders ? (
                      <tr><td colSpan={5} className="p-12 text-center text-gray-500"><div className="flex justify-center items-center gap-2"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>Loading orders...</div></td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-gray-500">No orders found. Keep your gigs active to get new buyers!</td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{order.gigId?.title || "Unknown Gig"}</p>
                            {order.deliveryUrl && (
                              <a href={order.deliveryUrl} target="_blank" className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-200 hover:bg-blue-100">
                                📁 View Submitted File
                              </a>
                            )}
                            {!order.deliveryUrl && <p className="text-xs text-gray-500 mt-1 font-mono">TX: {order.escrowTxHash?.slice(0, 10)}...</p>}
                          </td>
                          <td className="p-4 text-gray-700">{order.buyerId?.name || "Unknown Buyer"}</td>
                          <td className="p-4 font-bold text-gray-900">${order.amount} USDT</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              order.status === 'Funded' ? 'bg-blue-100 text-blue-700' : 
                              order.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 
                              order.status === 'Submitted' ? 'bg-purple-100 text-purple-700' :
                              order.status === 'Revision Requested' ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {(order.status === "Funded" || order.status === "In Progress") && (
                              <button onClick={() => { setSelectedOrderId(order._id); setDeliveryModalOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition">
                                Work Done / Submit
                              </button>
                            )}
                            {order.status === "Revision Requested" && (
                               <button onClick={() => { setSelectedOrderId(order._id); setDeliveryModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition">
                                Submit Revision
                             </button>
                            )}
                            {order.status === "Submitted" && <span className="text-sm text-gray-500">Waiting for Buyer...</span>}
                            {order.status === "Completed" && <span className="text-sm text-green-600 font-bold">Paid ✔</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-500">Communicate with buyers about active orders and inquiries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Conversations List */}
                <div className="md:col-span-1 bg-white border rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b p-4 font-bold text-gray-800">Inbox</div>
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {conversations.length === 0 ? (
                       <p className="p-4 text-sm text-gray-500">No messages yet.</p>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv._id}
                          onClick={() => setSelectedChat(conv)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition flex items-start gap-3 ${
                            selectedChat?._id === conv._id ? "bg-blue-50 border-l-4 border-blue-600" : "border-l-4 border-transparent"
                          }`}
                        >
                          <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-200 shrink-0 border shadow-sm">
                            {conv.gigImageUrl ? (
                              <Image src={conv.gigImageUrl} alt="Gig" fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">IMG</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-sm text-gray-900 truncate pr-2">{conv.otherUserName}</p>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {new Date(conv.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 font-medium truncate mb-1">{conv.gigTitle}</p>
                            <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
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
                    <div className="h-full min-h-[500px] flex items-center justify-center border-2 border-dashed rounded-xl bg-gray-50 text-gray-500">
                      Select a conversation to start chatting
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EARNINGS & WALLET TAB */}
          {activeTab === "earnings" && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Seller wallet</p>
                    <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Earnings & Wallet</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                      Check your on-chain MockUSDT balance and transfer tokens to another wallet.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl shadow-inner">
                    $
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Live wallet balance */}
                <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
                  <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-emerald-50" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-500">Live wallet balance</p>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">ON-CHAIN</span>
                    </div>
                    <div className="mt-5 flex items-end gap-3">
                      <h4 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">${displayBalance}</h4>
                      <span className="pb-1 text-sm font-semibold text-slate-500">USDT</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      This amount is read from the token contract for your connected wallet.
                    </p>

                    <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected wallet</p>
                      {address ? (
                        <p className="mt-2 break-all font-mono text-sm text-slate-800">
                          {address}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-amber-700">Connect MetaMask to view your wallet balance.</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void refetchUsdt()}
                      disabled={!address}
                      className="mt-5 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Refresh balance
                    </button>
                  </div>
                </section>

                {/* Withdrawal form */}
                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                        ↗
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-950">Withdraw MockUSDT</h3>
                        <p className="mt-1 text-sm text-slate-500">Send tokens to a destination address.</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-5">
                    <div>
                      <label htmlFor="withdraw-address" className="mb-2 block text-sm font-semibold text-slate-700">
                        Destination address
                      </label>
                      <input
                        id="withdraw-address"
                        required
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="0x..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                      />
                      <p className="mt-2 text-xs text-slate-500">Double-check the address and network before confirming in MetaMask.</p>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="withdraw-amount" className="block text-sm font-semibold text-slate-700">
                          Amount (USDT)
                        </label>
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(displayBalance)}
                          disabled={!address || Number(displayBalance) <= 0 || isWithdrawPending || isWithdrawConfirming}
                          className="text-xs font-bold uppercase tracking-wide text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-20 text-lg font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">USDT</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Available: {displayBalance} USDT</span>
                        <span>Network fees may apply</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!address || isWithdrawPending || isWithdrawConfirming || !withdrawAddress || !withdrawAmount}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {isWithdrawPending
                        ? "Waiting for MetaMask..."
                        : isWithdrawConfirming
                          ? "Confirming on blockchain..."
                          : "Withdraw USDT"}
                    </button>

                    <p className="text-xs leading-5 text-slate-500">
                      Your displayed balance updates from the token contract after the transaction is confirmed. Never share your recovery phrase or private key.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Submit Delivery</h3>
            <form onSubmit={handleSubmitDelivery}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Link (Google Drive, Dropbox, IPFS)</label>
              <input required type="url" placeholder="https://drive.google.com/..." 
                className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} />
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setDeliveryModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                <button type="submit" disabled={isSubmittingDelivery} className="px-6 py-2 bg-green-600 text-white rounded-md font-medium disabled:opacity-50">
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