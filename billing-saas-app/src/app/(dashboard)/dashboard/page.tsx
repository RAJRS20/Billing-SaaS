import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your jewellery shop — sales, stock, gold rates and outstanding dues.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
