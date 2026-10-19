"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { FlashUSDT } from "@/components/FlashUSDT"; // ✅ Added import

interface IGig {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime: number;
  imageUrl?: string;
}

const CATEGORIES = ["All", "Web Development", "Smart Contracts", "UI/UX Design", "Content Writing"];

export default function HomePage() {
  const [gigs, setGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Recommendations states
  const [showRecommendations, setShowRecommendations] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch gigs whenever search or category changes
  useEffect(() => {
    const fetchGigs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gigs?search=${searchQuery}&category=${selectedCategory}`);
        const data = await res.json();
        if (res.ok) {
          setGigs(data.gigs);
        }
      } catch (error) {
        console.error("Failed to load gigs", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search so it doesn't spam the database on every keystroke
    const timer = setTimeout(() => {
      fetchGigs();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  // Handle clicking outside the search box to hide recommendations
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowRecommendations(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get top 3 recommendations based on current input
  const recommendations = gigs
    .filter((gig) => gig.title.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Find the perfect freelance services for your business
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            Work with talented freelancers and pay securely with USDT Escrow.
          </p>

          {/* Search Box Container */}
          <div className="relative max-w-2xl mx-auto" ref={searchRef}>
            <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden p-2 gap-2">
              <input
                type="text"
                placeholder="Search for a service (e.g., 'Next.js')..."
                className="flex-grow px-4 py-3 text-gray-900 focus:outline-none"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowRecommendations(true);
                }}
                onFocus={() => setShowRecommendations(true)}
              />
              <select
                className="px-4 py-3 text-gray-900 border-l focus:outline-none bg-gray-50 cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Recommendations Dropdown */}
            {showRecommendations && recommendations.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl text-left overflow-hidden z-20 border">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Suggestions
                </div>
                {recommendations.map((rec) => (
                  <div
                    key={rec._id}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-t"
                    onClick={() => {
                      setSearchQuery(rec.title);
                      setShowRecommendations(false);
                    }}
                  >
                    <div className="w-8 h-8 relative rounded overflow-hidden shrink-0">
                      <Image
                        src={rec.imageUrl || "https://via.placeholder.com/100"}
                        alt={rec.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 truncate">{rec.title}</p>
                      <p className="text-xs text-gray-500">{rec.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Flash USDT Faucet Area */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <FlashUSDT />
      </div>

      {/* Main Content / Gigs Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedCategory === "All" ? "Explore All Services" : selectedCategory}
          </h2>
          <span className="text-gray-500 text-sm">{gigs.length} results found</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No gigs found</h3>
            <p className="text-gray-500">Try adjusting your search terms or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gigs.map((gig) => (
              <Link 
                key={gig._id} 
                href={`/gigs/${gig._id}`}
                className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow group flex flex-col"
              >
                {/* Gig Image */}
                <div className="h-48 relative overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gig.imageUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"}
                    alt={gig.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-blue-700 shadow-sm">
                    {gig.category}
                  </div>
                </div>

                {/* Gig Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                    {gig.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
                    {gig.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {gig.deliveryTime} Days
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Starting at</span>
                      <span className="text-lg font-bold text-green-600">{gig.price} USDT</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}