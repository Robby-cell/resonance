import type { Metadata, Viewport } from "next";
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
  manifest: "./manifest.webmanifest",
  icons: {
    icon: [
      { url: "./favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "./icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "./apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Resonance",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
      </head>
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
