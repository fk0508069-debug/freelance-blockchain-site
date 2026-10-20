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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000";

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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="w-10 h-10 rounded-full border-2 border-[#E4E5E7] border-t-[#1DBF73] animate-spin" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F7] px-5">
        <div className="w-full max-w-md rounded-2xl border border-[#E4E5E7] bg-white px-6 py-16 text-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="mt-4 text-xl font-semibold text-[#222325]">
            {error || "Gig not found"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#62646A]">
            The gig you are looking for might have been removed or is temporarily
            unavailable.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#222325] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Browse other gigs
          </Link>
        </div>
      </div>
    );
  }

  const sellerJoinedDate = new Date(gig.sellerId.createdAt).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Breadcrumbs */}
        <nav
          className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#62646A]"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="transition hover:text-[#1DBF73]">
            Home
          </Link>
          <span className="text-[#9CA0A6]">/</span>
          <Link
            href={`/?category=${gig.category}`}
            className="transition hover:text-[#1DBF73]"
          >
            {gig.category}
          </Link>
          <span className="text-[#9CA0A6]">/</span>
          <span className="max-w-[200px] truncate font-medium text-[#222325] sm:max-w-xs">
            {gig.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Main Content */}
          <div className="space-y-8 lg:col-span-8">
            {/* Gig Main Card */}
            <div className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white shadow-sm">
              <div className="relative h-64 w-full overflow-hidden bg-[#F7F7F7] sm:h-80 md:h-[420px]">
                <Image
                  src={gig.imageUrl || FALLBACK_IMAGE}
                  alt={gig.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />

                <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#222325] shadow-sm backdrop-blur">
                  {gig.category}
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <h1 className="text-2xl font-normal tracking-tight text-[#222325] sm:text-[34px] sm:leading-[48px] sm:tracking-[-1.2px]">
                  {gig.title}
                </h1>

                <div className="mt-5 whitespace-pre-wrap text-base leading-7 text-[#62646A]">
                  {gig.description}
                </div>
              </div>
            </div>

            {/* Seller Profile Card */}
            <div className="rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-[21px] font-normal leading-[25px] text-[#222325]">
                Meet the Seller
              </h2>

              <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#222325] text-3xl font-semibold uppercase text-white">
                  {gig.sellerId.name.charAt(0)}
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[#222325]">
                    {gig.sellerId.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#62646A]">
                    Member since {sellerJoinedDate}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EF] px-3 py-1.5 font-semibold text-[#1A9F60]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Verified Seller
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F7] px-3 py-1.5 font-semibold text-[#62646A]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
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
            <div className="sticky top-8 rounded-2xl border border-[#E4E5E7] bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-baseline justify-between border-b border-[#E4E5E7] pb-6">
                <span className="text-sm font-medium text-[#62646A]">
                  Total Price
                </span>
                <div className="text-right">
                  <span className="text-3xl font-semibold text-[#222325] sm:text-4xl">
                    {gig.price}
                  </span>
                  <span className="ml-1 text-sm font-medium text-[#1DBF73]">
                    USDT
                  </span>
                </div>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7]">
                    <svg
                      className="h-4 w-4 text-[#62646A]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#222325]">
                      {gig.deliveryTime}{" "}
                      {gig.deliveryTime === 1 ? "Day" : "Days"} Delivery
                    </p>
                    <p className="text-xs text-[#62646A]">
                      Time to complete the work
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8EF]">
                    <svg
                      className="h-4 w-4 text-[#1A9F60]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#222325]">
                      Escrow Protected
                    </p>
                    <p className="text-xs text-[#62646A]">
                      Funds released only when you approve
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinue}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#222325] px-6 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Continue to Order
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>

                <button
                  onClick={handleContactSeller}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E4E5E7] bg-white px-6 text-sm font-semibold text-[#222325] transition hover:bg-[#F7F7F7]"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Contact Seller
                </button>
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#9CA0A6]">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Secure Escrow Transaction
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E4E5E7] bg-[#F7F7F7] px-6 py-4">
              <h3 className="text-base font-semibold text-[#222325]">
                Message the Seller
              </h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="rounded-full p-1.5 text-[#62646A] transition hover:bg-[#E4E5E7] hover:text-[#222325]"
                aria-label="Close chat"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
          <div className="w-10 h-10 rounded-full border-2 border-[#E4E5E7] border-t-[#1DBF73] animate-spin" />
        </div>
      }
    >
      <GigDetailsContent />
    </Suspense>
  );
}