import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Cloudflare Web Analytics token. Grab from:
// Cloudflare Dash → Analytics & Logs → Web Analytics → whistlerbrew.com
// Leave empty to disable. Same token also pasted into standalone HTML
// pages under /public (wildfire, pushup, opus, firesmart, simtable, sitrep).
const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN || "";

export const metadata: Metadata = {
  title: "WhistlerBrew.com",
  description: "Test site for Brew's projects in AI, Automation, and Data Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        {CF_ANALYTICS_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={`{"token":"${CF_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
