import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "World Cup 2026 — Prediction League",
  description: "Predict, compete and climb the leaderboard for FIFA World Cup 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hy">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
