import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "World Cup 2026 — Prediction League",
  description: "Predict, compete and climb the leaderboard for FIFA World Cup 2026.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let content extend under the notch/home indicator so env(safe-area-inset-*) works.
  viewportFit: "cover",
  themeColor: "#050a16",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hy">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
