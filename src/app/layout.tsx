import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from "@/components/shared/theme-provider"
import NextAuthSessionProvider from "@/components/shared/session-provider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  // `template` applies to child segments, so every page can name itself while
  // `default` covers the landing page. Without this, each route reused one
  // title and browser tabs were indistinguishable.
  title: {
    default: "LingoMatch — practise a language your way",
    template: "%s · LingoMatch",
  },
  description:
    "Practise a language with an AI tutor, exchange messages with real partners, or go live when you choose. Video is always optional.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <NextAuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}
