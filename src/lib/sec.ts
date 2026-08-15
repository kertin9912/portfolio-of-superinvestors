import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  getManagerBySlug,
  managers,
  portfolioKey,
  type Manager,
  type Portfolio,
  type PortfolioComparison,
  type PortfolioSnapshot,
  type Position,
} from "./portfolio";

export { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, getManagerBySlug, managers, type Manager, type Portfolio, type PortfolioComparison, type Position };

function isPortfolioSnapshot(value: unknown): value is PortfolioSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Partial<PortfolioSnapshot>;
  return snapshot.version === 1 && typeof snapshot.updatedAt === "string" && typeof snapshot.comparison === "object" && snapshot.comparison !== null;
}

async function getSnapshotNamespace(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext({ async: true });
  return env.PORTFOLIO_SNAPSHOTS;
}

const getPortfolioSnapshot = cache(async (cik: string): Promise<PortfolioSnapshot | null> => {
  const namespace = await getSnapshotNamespace();
  const value: unknown = await namespace.get(portfolioKey(cik), { type: "json", cacheTtl: 60 });
  return isPortfolioSnapshot(value) ? value : null;
});

export const getLatestPortfolio = cache(async (cik: string): Promise<Portfolio> => {
  const snapshot = await getPortfolioSnapshot(cik);
  if (!snapshot) throw new Error(`Persisted 13F snapshot is not available for CIK ${cik}`);
  return snapshot.comparison.current;
});

export const getPortfolioComparison = cache(async (cik: string): Promise<PortfolioComparison> => {
  const snapshot = await getPortfolioSnapshot(cik);
  if (!snapshot) throw new Error(`Persisted 13F snapshot is not available for CIK ${cik}`);
  return snapshot.comparison;
});

export async function getManagerDashboard() {
  const namespace = await getSnapshotNamespace();
  const keys = managers.map((manager) => portfolioKey(manager.cik));
  const stored = await namespace.get(keys, { type: "json", cacheTtl: 60 });

  return managers.map((config) => {
    const value = stored.get(portfolioKey(config.cik));
    const snapshot = isPortfolioSnapshot(value) ? value : null;
    return {
      config,
      portfolio: snapshot?.comparison.current ?? null,
      updatedAt: snapshot?.updatedAt ?? null,
      error: snapshot ? null : "PERSISTED SNAPSHOT PENDING",
    };
  });
}
