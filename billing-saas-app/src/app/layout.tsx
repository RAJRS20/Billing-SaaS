import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JewelBill SaaS — Gold Jewellery Billing & Inventory",
    template: "%s | JewelBill SaaS",
  },
  description:
    "Professional cloud-based billing and inventory management system for gold jewellery shops. Multi-tenant SaaS with POS billing, stock management, GST invoicing and reports.",
  keywords: [
    "jewellery billing",
    "gold billing software",
    "jewellery inventory",
    "GST invoice jewellery",
    "SaaS billing",
  ],
  authors: [{ name: "JewelBill" }],
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
