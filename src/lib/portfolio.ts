export const managers = [
  { slug: "berkshire-hathaway", cik: "0001067983", displayName: "Berkshire Hathaway", profileLine: "Warren E. Buffett · Omaha, Nebraska", aliases: ["Warren Buffett"], category: "SUPERINVESTOR" },
  { slug: "pershing-square", cik: "0001336528", displayName: "Pershing Square Capital Management", profileLine: "Bill Ackman · New York, New York", aliases: ["Bill Ackman"], category: "SUPERINVESTOR" },
  { slug: "bridgewater-associates", cik: "0001350694", displayName: "Bridgewater Associates", profileLine: "Ray Dalio · Westport, Connecticut", aliases: ["Ray Dalio"], category: "SUPERINVESTOR" },
  { slug: "tiger-global", cik: "0001167483", displayName: "Tiger Global Management", profileLine: "Chase Coleman · New York, New York", aliases: ["Chase Coleman"], category: "SUPERINVESTOR" },
  { slug: "hh-international-investment", cik: "0001759760", displayName: "Duan Yongping · H&H International Investment", profileLine: "Duan Yongping · Palo Alto, California", aliases: ["Duan Yongping"], category: "SUPERINVESTOR" },
  { slug: "himalaya-capital-management", cik: "0001709323", displayName: "Li Lu · Himalaya Capital Management", profileLine: "Li Lu · Seattle, Washington", aliases: ["Li Lu"], category: "SUPERINVESTOR" },
  { slug: "situational-awareness", cik: "0002045724", displayName: "Leopold Aschenbrenner · Situational Awareness LP", profileLine: "Leopold Aschenbrenner · San Francisco, California", aliases: ["Leopold Aschenbrenner"], category: "SUPERINVESTOR" },
  { slug: "baupost-group", cik: "0001061768", displayName: "Baupost Group", profileLine: "Seth Klarman · Boston, Massachusetts", aliases: ["Seth Klarman"], category: "SUPERINVESTOR" },
  { slug: "fundsmith", cik: "0001569205", displayName: "Fundsmith LLP", profileLine: "Terry Smith · London, United Kingdom", aliases: ["Terry Smith"], category: "SUPERINVESTOR" },
  { slug: "appaloosa", cik: "0001656456", displayName: "Appaloosa LP", profileLine: "David Tepper · Short Hills, New Jersey", aliases: ["David Tepper"], category: "SUPERINVESTOR" },
  { slug: "akre-capital-management", cik: "0001112520", displayName: "Akre Capital Management", profileLine: "Chuck Akre · Middleburg, Virginia", aliases: ["Chuck Akre"], category: "SUPERINVESTOR" },
  { slug: "third-point", cik: "0001040273", displayName: "Third Point LLC", profileLine: "Daniel S. Loeb · New York, New York", aliases: ["Daniel Loeb"], category: "SUPERINVESTOR" },
  { slug: "calpers", cik: "0000919079", displayName: "California Public Employees' Retirement System", profileLine: "CalPERS · Sacramento, California", aliases: ["CalPERS", "California Public Employees Retirement System"], category: "GLOBAL ASSET OWNER" },
  { slug: "cpp-investments", cik: "0001283718", displayName: "Canada Pension Plan Investment Board", profileLine: "CPP Investments · Toronto, Canada", aliases: ["CPPIB", "CPP Investments"], category: "GLOBAL ASSET OWNER" },
  { slug: "calstrs", cik: "0001081019", displayName: "California State Teachers' Retirement System", profileLine: "CalSTRS · West Sacramento, California", aliases: ["CalSTRS", "California State Teachers Retirement System"], category: "GLOBAL ASSET OWNER" },
  { slug: "temasek-holdings", cik: "0001021944", displayName: "Temasek Holdings", profileLine: "Sovereign investor · Singapore", aliases: ["Temasek", "Temasek Holdings Private Limited"], category: "GLOBAL ASSET OWNER" },
  { slug: "saudi-public-investment-fund", cik: "0001767640", displayName: "Public Investment Fund", profileLine: "Saudi PIF · Riyadh, Saudi Arabia", aliases: ["PIF", "Saudi PIF", "Saudi Public Investment Fund"], category: "GLOBAL ASSET OWNER" },
] as const;

export type Manager = (typeof managers)[number];

export function getManagerBySlug(slug: string): Manager | undefined {
  return managers.find((manager) => manager.slug === slug);
}

export type FilingMeta = {
  accessionNumber: string;
  acceptanceDateTime: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  reportDate: string;
};

export type Position = { cusip: string; issuer: string; titleOfClass: string; value: number; shares: number; weight: number };
export type PositionChange = Position & { activity: "NEW" | "ADDED" | "REDUCED" | "UNCHANGED"; shareChange: number | null };
export type Portfolio = { cik: string; managerName: string; filing: FilingMeta; filingUrl: string; positions: Position[]; totalValue: number };
export type PortfolioComparison = {
  current: Portfolio;
  previous: Portfolio | null;
  positions: PositionChange[];
  sold: Array<Position & { activity: "SOLD"; shareChange: -100 }>;
  valueChange: number | null;
};
export type PortfolioSnapshot = { version: 1; updatedAt: string; comparison: PortfolioComparison };

export function portfolioKey(cik: string): string {
  return `portfolio:v1:${cik}`;
}

export function comparePortfolios(current: Portfolio, previous: Portfolio | null): PortfolioComparison {
  const previousBySecurity = new Map(previous?.positions.map((position) => [`${position.cusip}:${position.titleOfClass}`, position]) ?? []);
  const currentKeys = new Set<string>();
  const positions: PositionChange[] = current.positions.map((position) => {
    const key = `${position.cusip}:${position.titleOfClass}`;
    currentKeys.add(key);
    const old = previousBySecurity.get(key);
    if (!old) return { ...position, activity: "NEW", shareChange: null };
    const change = old.shares > 0 ? ((position.shares - old.shares) / old.shares) * 100 : null;
    const activity = change === null || Math.abs(change) < 0.005 ? "UNCHANGED" : change > 0 ? "ADDED" : "REDUCED";
    return { ...position, activity, shareChange: change };
  });
  const sold = (previous?.positions ?? [])
    .filter((position) => !currentKeys.has(`${position.cusip}:${position.titleOfClass}`))
    .map((position) => ({ ...position, activity: "SOLD" as const, shareChange: -100 as const }));
  return {
    current,
    previous,
    positions,
    sold,
    valueChange: previous && previous.totalValue > 0 ? ((current.totalValue - previous.totalValue) / previous.totalValue) * 100 : null,
  };
}

export function formatMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
export function formatNumber(value: number): string { return Math.round(value).toLocaleString("en-US"); }
export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${match[3]} ${month}, ${match[1]}` : value;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/New_York",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}, ${part("year")} · ${part("hour")}:${part("minute")} ET`;
}
