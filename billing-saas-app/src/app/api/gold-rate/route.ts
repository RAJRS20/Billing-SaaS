import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export async function GET() {
  try {
    const { tenantId } = await getActiveTenantContext();

    let rate22K = 6672;
    let rate24K = 7280;

    if (tenantId) {
      // Find latest rate
      const latestRates = await prisma.goldRate.findMany({
        where: { tenantId },
        include: { purity: true },
        orderBy: { effectiveAt: "desc" },
        take: 10,
      });

      const found22K = latestRates.find(
        (r) => r.purity?.name?.toUpperCase().includes("22")
      );
      const found24K = latestRates.find(
        (r) => r.purity?.name?.toUpperCase().includes("24")
      );

      if (found22K) {
        rate22K = Number(found22K.ratePerGram);
      } else if (latestRates.length > 0) {
        rate22K = Number(latestRates[0].ratePerGram);
      }

      if (found24K) {
        rate24K = Number(found24K.ratePerGram);
      }
    }

    return NextResponse.json({
      rate22K,
      rate24K,
      display22K: `₹${rate22K.toLocaleString("en-IN")}/g`,
      display24K: `₹${rate24K.toLocaleString("en-IN")}/g`,
      changePercent: "+0.8%",
    });
  } catch (err: any) {
    return NextResponse.json({
      rate22K: 6672,
      rate24K: 7280,
      display22K: "₹6,672/g",
      display24K: "₹7,280/g",
      changePercent: "+0.8%",
      error: err?.message,
    });
  }
}
