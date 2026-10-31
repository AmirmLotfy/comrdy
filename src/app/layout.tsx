import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const siteUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://127.0.0.1:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "COMRDY",
    title: "COMRDY — Test the purchase. Before the capture.",
    description:
      "A confirmed contract. A changed merchant state. An inspectable decision. A controlled test lab for AI checkout.",
    images: [
      {
        url: "/brand/comrdy-og.png",
        width: 1200,
        height: 630,
        alt: "COMRDY transaction assurance: requested size M changes to S, so capture is blocked. Illustrative example.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "COMRDY — Test the purchase. Before the capture.",
    description: "Test AI checkout against the customer's confirmed intent.",
    images: ["/brand/comrdy-og.png"],
  },
  title: {
    default: "COMRDY — Keep the purchase inside the promise",
    template: "%s · COMRDY",
  },
  description:
    "Test whether an AI shopping journey preserves the customer's instructions. Inspect intent, merchant state, and the payment decision in one evidence trail.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
