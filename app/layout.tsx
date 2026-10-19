import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Suspense } from "react"; // <-- Import Suspense

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FreelanceChain",
  description: "Blockchain-Based Freelance Marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {/* ✅ Wrap Navbar in Suspense */}
          <Suspense fallback={<div className="h-16 bg-white border-b"></div>}>
            <Navbar />
          </Suspense>
          
          <main className="min-h-[calc(100vh-73px)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}