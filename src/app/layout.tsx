import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resonance — Your Music, Your Device",
  description:
    "A polished music player that lives in your browser. Upload, stream, organize playlists, and discover new music — all stored locally on your device.",
  keywords: [
    "music player",
    "local music",
    "playlists",
    "IndexedDB",
    "browser music",
    "music discovery",
  ],
  authors: [{ name: "Resonance" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Sonner
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a24",
              color: "#f5f5f7",
              border: "1px solid rgba(255,255,255,0.08)",
            },
          }}
        />
      </body>
    </html>
  );
}
