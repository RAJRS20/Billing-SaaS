import type { Metadata } from "next";
import BillingClient from "./BillingClient";

export const metadata: Metadata = {
  title: "POS Billing",
  description: "Create new jewellery invoices with live gold rate pricing, barcode scanning, and multi-mode payments.",
};

export default function BillingPage() {
  return <BillingClient />;
}
