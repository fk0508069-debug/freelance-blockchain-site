"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChatBox } from "@/components/ChatBox";

interface IGig {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime: number;
  imageUrl?: string;
  sellerId: {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

function GigDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [gig, setGig] = useState<IGig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await fetch(`/api/gigs/${id}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to load gig");
        setGig(data.gig);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchGig();
  }, [id]);

  const handleContinue = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    router.push(`/checkout/${gig?._id}`);
  };

  const handleContactSeller = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    setIsChatOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{error || "Gig not found"}</h1>
          <p className="text-gray-500 mb-6">The gig you are looking for might have been removed or is temporarily unavailable.</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition">
            Browse other gigs
          </Link>
        </div>
      </div>
    );
  }

  const sellerJoinedDate = new Date(gig.sellerId.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/?category=${gig.category}`} className="hover:text-blue-600 transition-colors">{gig.category}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs">{gig.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Main Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Gig Main Card */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="w-full h-64 sm:h-80 md:h-[400px] relative bg-gray-100">
                <Image
                  src={gig.imageUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000"}
                  alt={gig.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    {gig.category}
                  </span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
                  {gig.title}
                </h1>

                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap text-base sm:text-lg leading-relaxed">
                  {gig.description}
                </div>
              </div>
            </div>

            {/* Seller Profile Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Meet the Seller</h2>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center text-3xl font-bold uppercase shrink-0 shadow-md">
                  {gig.sellerId.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{gig.sellerId.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">Member since {sellerJoinedDate}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified Seller
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-1 rounded-full font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Responds quickly
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Pricing Card */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-2xl border shadow-lg sticky top-8">
              
              <div className="flex justify-between items-baseline mb-6 pb-6 border-b">
                <span className="text-gray-500 font-medium">Total Price</span>
                <div className="text-right">
                  <span className="text-4xl font-extrabold text-gray-900">${gig.price}</span>
                  <span className="text-sm text-gray-500 ml-1 font-medium">USDT</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{gig.deliveryTime} Days Delivery</p>
                    <p className="text-xs text-gray-500">Time to complete the work</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Escrow Protected</p>
                    <p className="text-xs text-gray-500">Funds released only when you approve</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Continue to Order
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                {/* Contact Seller Button */}
                <button
                  onClick={handleContactSeller}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Seller
                </button>
              </div>

              <p className="text-xs text-center text-gray-400 mt-6 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure Escrow Transaction
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Chat Modal Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Message the Seller</h3>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* ChatBox Component */}
                     {/* ChatBox Component */}
            <div className="p-4">
              <ChatBox 
                gigId={gig._id} 
                receiverId={gig.sellerId._id} 
                receiverName={gig.sellerId.name} 
                gigTitle={gig.title} // <-- Add this line
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function GigDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GigDetailsContent />
    </Suspense>
  );
}