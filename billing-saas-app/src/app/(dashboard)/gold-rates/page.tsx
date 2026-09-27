import type { Metadata } from "next";
import GoldRatesClient, { RateItem, RateHistoryItem } from "./GoldRatesClient";
import prisma from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Gold Rates",
  description: "Live daily gold rates management and historical audit trail.",
};

export default async function GoldRatesPage() {
  const { tenantId } = await getActiveTenantContext();

  const [dbPurities, dbRates, dbMetals] = await Promise.all([
    prisma.purity.findMany({
      where: { tenantId },
      orderBy: { fineness: "desc" },
    }),
    prisma.goldRate.findMany({
      where: { tenantId },
      include: { purity: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.metal.findMany({
      where: { tenantId },
    }),
  ]);

  const defaultMetalId = dbMetals[0]?.id || "";

  // Available purities with metalId
  const availablePurities = dbPurities.map((p) => ({
    id: p.id,
    name: p.name,
    fineness: Number(p.fineness),
    metalId: p.metalId || defaultMetalId,
  }));

  // Find latest rate for each purity
  const currentRates: RateItem[] = dbPurities.map((p) => {
    const latest = dbRates.find((r) => r.purityId === p.id);
    const rate = latest ? Number(latest.ratePerGram) : Math.round(Number(p.fineness) * 6672);
    return {
      purityId: p.id,
      metalId: p.metalId || defaultMetalId,
      purity: p.name,
      fineness: Number(p.fineness),
      rate,
      change: 45,
      pct: 0.72,
    };
  });

  // History grouped by date
  const historyMap = new Map<string, { rate24K: number; rate22K: number; updatedBy: string; time: string }>();

  for (const r of dbRates) {
    const d = new Date(r.effectiveAt);
    const dateStr = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);

    const timeStr = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    if (!historyMap.has(dateStr)) {
      historyMap.set(dateStr, {
        rate24K: 0,
        rate22K: 0,
        updatedBy: "Admin",
        time: timeStr,
      });
    }

    const entry = historyMap.get(dateStr)!;
    if (r.purity?.name.includes("24") && entry.rate24K === 0) {
      entry.rate24K = Number(r.ratePerGram);
    } else if (r.purity?.name.includes("22") && entry.rate22K === 0) {
      entry.rate22K = Number(r.ratePerGram);
    }
  }

  const history: RateHistoryItem[] = Array.from(historyMap.entries()).map(([date, val]) => ({
    date,
    rate24K: val.rate24K || (val.rate22K ? Math.round(val.rate22K / 0.916) : 6672),
    rate22K: val.rate22K || (val.rate24K ? Math.round(val.rate24K * 0.916) : 6120),
    updatedBy: val.updatedBy,
    time: val.time,
  })).slice(0, 10);

  return (
    <GoldRatesClient
      currentRates={currentRates}
      history={history}
      availablePurities={availablePurities}
    />
  );
}
