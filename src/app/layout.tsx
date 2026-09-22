import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { getCurrentUser } from "@/features/auth/session";
import { logoutAction } from "@/features/auth/actions";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "DAMA — Competitive Checkers Arena", template: "%s · DAMA" },
  description:
    "DAMA is a competitive esports arena for Dama/Checkers. Rated ladders, fair matchmaking, server-validated play.",
};

export const viewport: Viewport = {
  themeColor: "#04070d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Navbar user={user} onLogout={logoutAction} />
        <main
          className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-4 ${
            user ? "pb-24 sm:pb-10" : "pb-10"
          }`}
        >
          {children}
        </main>
        {user ? <MobileNav /> : null}
        <footer className="border-t border-arena-800/70 py-4 text-center">
          <p className="px-4 text-xs text-slate-500">
            DAMA · competitive Dama · operator-processed payments ·{" "}
            <Link href="/help" className="transition hover:text-accent">Help</Link> ·{" "}
            <Link href="/responsible-play" className="transition hover:text-accent">Responsible play</Link> ·{" "}
            <Link href="/terms" className="transition hover:text-accent">Terms</Link> ·{" "}
            <Link href="/privacy" className="transition hover:text-accent">Privacy</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
