"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isBuyerDash = pathname?.startsWith("/dashboard/buyer");
  const isSellerDash = pathname?.startsWith("/dashboard/seller");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper for rendering user initials
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/home"
            className="text-2xl font-black text-blue-600 tracking-tight hover:opacity-90 transition"
          >
            FreelanceChain
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/gigs"
              className={`text-sm font-medium transition-colors ${
                pathname === "/gigs"
                  ? "text-blue-600 font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Browse Gigs
            </Link>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-4">


          {session ? (
            <div className="relative pl-2 border-l border-gray-200" ref={dropdownRef}>
              {/* Account Button / Avatar */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                aria-expanded={dropdownOpen}
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User Avatar"}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
                    {getInitials(session.user?.name)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left pr-1">
                  <span className="text-sm font-semibold text-gray-800 leading-tight">
                    {session.user?.name || "Account"}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {isSellerDash
                      ? "Seller Mode"
                      : isBuyerDash
                      ? "Buyer Mode"
                      : "Member"}
                  </span>
                </div>
                {/* Chevron Icon */}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Account Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Signed in as
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                      {session.user?.email || session.user?.name}
                    </p>
                  </div>

                  {/* Mode / Dashboard Switches */}
                  <div className="py-2">
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Dashboard Views
                    </div>
                    <Link
                      href="/dashboard/buyer"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        isBuyerDash
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span>Buyer Dashboard</span>
                      {isBuyerDash && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </Link>

                    <Link
                      href="/dashboard/seller"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        isSellerDash
                          ? "bg-green-50 text-green-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span>Seller Dashboard</span>
                      {isSellerDash && (
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                      )}
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Profile Link */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      My Profile
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Sign Out Button */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}