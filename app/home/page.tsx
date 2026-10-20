
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface IGig {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime: number;
  imageUrl?: string;
}

const CATEGORIES = [
  "All",
  "Web Development",
  "Smart Contracts",
  "UI/UX Design",
  "Content Writing",
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80";

export default function HomePage() {
  const [gigs, setGigs] = useState<IGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showRecommendations, setShowRecommendations] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch gigs when search or category changes.
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          search: searchQuery.trim(),
          category: selectedCategory,
        });

        const res = await fetch(`/api/gigs?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Unable to load services. Please try again.");
        }

        const data = await res.json();

        setGigs(Array.isArray(data.gigs) ? data.gigs : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading services."
        );
        setGigs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedCategory]);

  // Close suggestions when clicking outside.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowRecommendations(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recommendations = gigs
    .filter(
      (gig) =>
        searchQuery.trim().length > 0 &&
        gig.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    .slice(0, 5);

  const heading =
    searchQuery.trim().length > 0
      ? `Results for "${searchQuery.trim()}"`
      : selectedCategory === "All"
        ? "Popular services"
        : selectedCategory;

  return (
    <main className="min-h-screen bg-white text-[#222325]">
      {/* Hero */}
      <section className="border-b border-[#E4E5E7] bg-[#F7F7F7]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E4E5E7] bg-white px-4 py-2 text-sm font-medium text-[#62646A]">
              <span className="h-2 w-2 rounded-full bg-[#1DBF73]" />
              Your next project starts here
            </p>

            <h1 className="text-4xl font-normal leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find the right talent for{" "}
              <span className="text-[#1DBF73]">your next big idea.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#62646A] sm:text-lg">
              Discover skilled freelancers, explore professional services,
              and get your projects done with secure USDT escrow.
            </p>

            {/* Search */}
            <div
              ref={searchRef}
              className="relative mx-auto mt-9 max-w-3xl text-left"
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setShowRecommendations(false);
                }}
                className="flex flex-col gap-2 rounded-2xl border border-[#E4E5E7] bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-[#62646A]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowRecommendations(true);
                    }}
                    onFocus={() => setShowRecommendations(true)}
                    placeholder="Try 'build a website' or 'smart contract'"
                    aria-label="Search freelance services"
                    autoComplete="off"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#222325] outline-none placeholder:text-[#9CA0A6] sm:text-base"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setShowRecommendations(false);
                      }}
                      className="rounded-full px-2 py-1 text-sm text-[#62646A] hover:bg-[#F7F7F7]"
                      aria-label="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    aria-label="Filter by category"
                    className="h-12 min-w-0 flex-1 rounded-full border border-[#E4E5E7] bg-white px-3 text-sm text-[#222325] outline-none focus:border-[#1DBF73] sm:max-w-48"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="h-12 rounded-full bg-[#222325] px-6 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Suggestions */}
              {showRecommendations && recommendations.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white text-left shadow-xl">
                  <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9CA0A6]">
                    Suggested services
                  </p>

                  {recommendations.map((gig) => (
                    <button
                      key={gig._id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(gig.title);
                        setShowRecommendations(false);
                      }}
                      className="flex w-full items-center gap-3 border-t border-[#E4E5E7] px-5 py-3 text-left transition hover:bg-[#F7F7F7]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gig.imageUrl || FALLBACK_IMAGE}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#222325]">
                          {gig.title}
                        </span>
                        <span className="mt-1 block text-xs text-[#62646A]">
                          {gig.category}
                        </span>
                      </span>

                      <span className="text-sm font-semibold text-[#1DBF73]">
                        {gig.price} USDT
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#62646A]">
              <span className="font-medium">Popular:</span>
              {["Next.js", "Smart Contracts", "UI/UX", "Web Design"].map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchQuery(term);
                      setShowRecommendations(false);
                    }}
                    className="underline decoration-[#D1D5DB] underline-offset-4 transition hover:text-[#1DBF73]"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category shortcuts */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-[#222325] bg-[#222325] text-white"
                    : "border-[#E4E5E7] bg-white text-[#62646A] hover:border-[#222325] hover:text-[#222325]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

     

      {/* Services */}
      <section
        id="services"
        className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#1DBF73]">
              EXPLORE THE MARKETPLACE
            </p>
            <h2 className="text-3xl font-normal tracking-tight text-[#222325] sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-2 text-sm text-[#62646A]">
              Find a service that matches your project and budget.
            </p>
          </div>

          {!loading && !error && (
            <span className="text-sm text-[#62646A]">
              {gigs.length} {gigs.length === 1 ? "service" : "services"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white"
              >
                <div className="aspect-[4/3] animate-pulse bg-[#F0F1F2]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-[#F0F1F2]" />
                  <div className="h-5 w-full animate-pulse rounded bg-[#F0F1F2]" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-[#F0F1F2]" />
                  <div className="mt-5 h-8 animate-pulse rounded bg-[#F0F1F2]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-[#222325]">
              Could not load services
            </h3>
            <p className="mt-2 text-sm text-[#62646A]">{error}</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery((current) => current);
                setSelectedCategory((current) => current);
              }}
              className="mt-5 rounded-full bg-[#222325] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
            >
              Try again
            </button>
          </div>
        ) : gigs.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E5E7] bg-[#F7F7F7] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">
              <svg
                className="h-6 w-6 text-[#62646A]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>
            </div>

            <h3 className="mt-4 text-xl font-semibold text-[#222325]">
              No services found
            </h3>
            <p className="mt-2 text-sm text-[#62646A]">
              Try a different search or select another category.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-5 rounded-full bg-[#222325] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gigs.map((gig) => (
              <Link
                key={gig._id}
                href={`/gigs/${gig._id}`}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E4E5E7] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#D1D5DB] hover:shadow-lg"
              >
                {/* Service image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F7F7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gig.imageUrl || FALLBACK_IMAGE}
                    alt={gig.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#222325] shadow-sm">
                    {gig.category}
                  </span>
                </div>

                {/* Service information */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#222325] transition group-hover:text-[#1A9F60]">
                    {gig.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#62646A]">
                    {gig.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-[#62646A]">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    Delivery in {gig.deliveryTime}{" "}
                    {gig.deliveryTime === 1 ? "day" : "days"}
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-[#E4E5E7] pt-4">
                    <span className="text-xs text-[#62646A]">
                      Starting at
                    </span>
                    <span className="text-lg font-semibold text-[#222325]">
                      {gig.price}{" "}
                      <span className="text-sm font-medium text-[#1DBF73]">
                        USDT
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer call to action */}
      <section className="border-t border-[#E4E5E7] bg-[#F7F7F7]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-2xl font-normal tracking-tight text-[#222325]">
              Have a project in mind?
            </h2>
            <p className="mt-2 text-sm text-[#62646A]">
              Explore services and find the right freelancer for the job.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById("services")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-full bg-[#222325] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Explore services
          </button>
        </div>
      </section>
    </main>
  );
}
