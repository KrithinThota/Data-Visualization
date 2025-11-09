import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Optimize font loading for better LCP
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevent invisible text during font load
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Performance Dashboard - Real-time Data Visualization",
  description: "High-performance real-time dashboard with 10,000+ data points at 60fps. Built with Next.js 15, React 19, TypeScript, and Canvas API.",
  keywords: [
    "Performance Dashboard",
    "Real-time Visualization",
    "Next.js",
    "React",
    "TypeScript",
    "Canvas API",
    "High Performance",
    "Data Visualization",
    "60 FPS",
    "Web Workers"
  ],
  authors: [{ name: "Performance Dashboard Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Performance Dashboard - Real-time Data Visualization",
    description: "High-performance dashboard rendering 10,000+ points at 60fps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Performance Dashboard",
    description: "Real-time data visualization at scale",
  },
  // Core Web Vitals optimization
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
