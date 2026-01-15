// ============================================================================
// File: app/layout.tsx
// Description: Root layout with providers, fonts, and metadata
// ============================================================================

import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "@/components/providers/Providers"

// Load Inter font with subsets
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "ENPS - Desh TV",
    template: "%s | ENPS - Desh TV",
  },
  description: "Electronic News Production System - Newsroom rundown management for Desh TV",
  keywords: ["ENPS", "newsroom", "rundown", "bulletin", "news production", "Desh TV"],
  authors: [{ name: "Desh TV" }],
  creator: "Desh TV",
  publisher: "Desh TV",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}