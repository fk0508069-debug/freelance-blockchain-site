"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell"; // ✅ Added Import

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
    <nav className="sticky top-0 z-50 border-b border-[#E4E5E7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/home"
            className="text-xl font-semibold tracking-tight text-[#222325] transition hover:opacity-80"
          >
            Freelance<span className="text-[#1DBF73]">Chain</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/gigs"
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                pathname === "/gigs"
                  ? "bg-[#F7F7F7] font-semibold text-[#222325]"
                  : "font-medium text-[#62646A] hover:bg-[#F7F7F7] hover:text-[#222325]"
              }`}
            >
              Browse Gigs
              {pathname === "/gigs" && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1DBF73] align-middle" />
              )}
            </Link>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* ✅ Notification Bell (Only shows if logged in) */}
          {session && <NotificationBell />}

          {session ? (
            <div
              className="relative border-l border-[#E4E5E7] pl-3"
              ref={dropdownRef}
            >
              {/* Account Button / Avatar */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full p-1.5 transition hover:bg-[#F7F7F7] focus:outline-none focus:ring-2 focus:ring-[#1DBF73]/25"
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User Avatar"}
                    className="h-9 w-9 rounded-full border border-[#E4E5E7] object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#222325] text-xs font-semibold text-white">
                    {getInitials(session.user?.name)}
                  </div>
                )}

                <div className="hidden flex-col pr-1 text-left lg:flex">
                  <span className="text-sm font-semibold leading-tight text-[#222325]">
                    {session.user?.name || "Account"}
                  </span>
                  <span className="text-xs capitalize text-[#9CA0A6]">
                    {isSellerDash
                      ? "Seller Mode"
                      : isBuyerDash
                      ? "Buyer Mode"
                      : "Member"}
                  </span>
                </div>

                {/* Chevron Icon */}
                <svg
                  className={`h-4 w-4 text-[#62646A] transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="border-b border-[#E4E5E7] bg-[#F7F7F7] px-4 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                      Signed in as
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-[#222325]">
                      {session.user?.email || session.user?.name}
                    </p>
                  </div>

                  {/* Mode / Dashboard Switches */}
                  <div className="py-2">
                    <div className="px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#9CA0A6]">
                      Dashboard Views
                    </div>

                    <Link
                      href="/dashboard/buyer"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        isBuyerDash
                          ? "bg-[#E8F8EF] font-semibold text-[#1A9F60]"
                          : "text-[#62646A] hover:bg-[#F7F7F7] hover:text-[#222325]"
                      }`}
                    >
                      <span>Buyer Dashboard</span>
                      {isBuyerDash && (
                        <span className="h-2 w-2 rounded-full bg-[#1DBF73]" />
                      )}
                    </Link>

                    <Link
                      href="/dashboard/seller"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        isSellerDash
                          ? "bg-[#E8F8EF] font-semibold text-[#1A9F60]"
                          : "text-[#62646A] hover:bg-[#F7F7F7] hover:text-[#222325]"
                      }`}
                    >
                      <span>Seller Dashboard</span>
                      {isSellerDash && (
                        <span className="h-2 w-2 rounded-full bg-[#1DBF73]" />
                      )}
                    </Link>
                  </div>

                  <div className="my-1 border-t border-[#E4E5E7]" />

                  {/* Profile Link */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#62646A] transition-colors hover:bg-[#F7F7F7] hover:text-[#222325]"
                    >
                      <svg
                        className="h-4 w-4 text-[#9CA0A6]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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

                  <div className="my-1 border-t border-[#E4E5E7]" />

                  {/* Sign Out Button */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#E02D2D] transition-colors hover:bg-[#E02D2D]/5"
                    >
                      <svg
                        className="h-4 w-4 text-[#E02D2D]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
            <div className="flex items-center gap-2 border-l border-[#E4E5E7] pl-3">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#222325] transition hover:bg-[#F7F7F7]"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#222325] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
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