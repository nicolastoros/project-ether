import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monster Gacha",
  description: "Idle pixel-art creature gacha prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject their own
          data-* attributes into <body> before React hydrates — a real mismatch, but a harmless
          one outside the app's control, not a bug in this tree. Without this, React logs a
          hydration-mismatch error on every load for anyone with such an extension installed. */}
      <body className="min-h-full" suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        {/* Was never mounted anywhere — every toast.success/toast.custom call in the app (Hidden
            Potential unlock, Super Attack level-up, and now achievement unlocks) was silently a
            no-op without this. top-center keeps it clear of BottomNav on mobile. */}
        <Toaster position="top-center" richColors={false} />
      </body>
    </html>
  );
}
