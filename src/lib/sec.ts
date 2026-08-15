import { cache } from "react";
import { XMLParser } from "fast-xml-parser";

const SEC_BASE = "https://www.sec.gov";
const SEC_DATA = "https://data.sec.gov";
const ACTIVE_WINDOW_REVALIDATE_SECONDS = 15 * 60;
const ARCHIVE_REVALIDATE_SECONDS = 365 * 24 * 60 * 60;
const DASHBOARD_BATCH_SIZE = 3;
const SEC_MAX_ATTEMPTS = 3;

const FILING_WINDOWS = [
  { month: 1, startDay: 11, endDay: 18 },
  { month: 4, startDay: 12, endDay: 18 },
  { month: 7, startDay: 11, endDay: 17 },
  { month: 10, startDay: 11, endDay: 17 },
] as const;

export const managers = [
  { slug: "berkshire-hathaway", cik: "0001067983", displayName: "Berkshire Hathaway", profileLine: "Warren E. Buffett · Omaha, Nebraska", aliases: ["Warren Buffett"] },
  { slug: "pershing-square", cik: "0001336528", displayName: "Pershing Square Capital Management", profileLine: "Bill Ackman · New York, New York", aliases: ["Bill Ackman"] },
  { slug: "bridgewater-associates", cik: "0001350694", displayName: "Bridgewater Associates", profileLine: "Ray Dalio · Westport, Connecticut", aliases: ["Ray Dalio"] },
  { slug: "tiger-global", cik: "0001167483", displayName: "Tiger Global Management", profileLine: "Chase Coleman · New York, New York", aliases: ["Chase Coleman"] },
  { slug: "hh-international-investment", cik: "0001759760", displayName: "Duan Yongping · H&H International Investment", profileLine: "Duan Yongping · Palo Alto, California", aliases: ["Duan Yongping"] },
  { slug: "himalaya-capital-management", cik: "0001709323", displayName: "Li Lu · Himalaya Capital Management", profileLine: "Li Lu · Seattle, Washington", aliases: ["Li Lu"] },
  { slug: "situational-awareness", cik: "0002045724", displayName: "Leopold Aschenbrenner · Situational Awareness LP", profileLine: "Leopold Aschenbrenner · San Francisco, California", aliases: ["Leopold Aschenbrenner"] },
  { slug: "baupost-group", cik: "0001061768", displayName: "Baupost Group", profileLine: "Seth Klarman · Boston, Massachusetts", aliases: ["Seth Klarman"] },
  { slug: "fundsmith", cik: "0001569205", displayName: "Fundsmith LLP", profileLine: "Terry Smith · London, United Kingdom", aliases: ["Terry Smith"] },
  { slug: "appaloosa", cik: "0001656456", displayName: "Appaloosa LP", profileLine: "David Tepper · Short Hills, New Jersey", aliases: ["David Tepper"] },
  { slug: "akre-capital-management", cik: "0001112520", displayName: "Akre Capital Management", profileLine: "Chuck Akre · Middleburg, Virginia", aliases: ["Chuck Akre"] },
  { slug: "third-point", cik: "0001040273", displayName: "Third Point LLC", profileLine: "Daniel S. Loeb · New York, New York", aliases: ["Daniel Loeb"] },
] as const;

export type Manager = (typeof managers)[number];

export function getManagerBySlug(slug: string): Manager | undefined {
  return managers.find((manager) => manager.slug === slug);
}

type JsonRecord = Record<string, unknown>;

type FilingColumns = {
  accessionNumber: string[];
  acceptanceDateTime: string[];
  filingDate: string[];
  form: string[];
  primaryDocument: string[];
  reportDate: string[];
};

export type FilingMeta = {
  accessionNumber: string;
  acceptanceDateTime: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  reportDate: string;
};

export type Position = {
  cusip: string;
  issuer: string;
  titleOfClass: string;
  value: number;
  shares: number;
  weight: number;
};

export type PositionChange = Position & {
  activity: "NEW" | "ADDED" | "REDUCED" | "UNCHANGED";
  shareChange: number | null;
};

export type Portfolio = {
  cik: string;
  managerName: string;
  filing: FilingMeta;
  filingUrl: string;
  positions: Position[];
  totalValue: number;
};

export type PortfolioComparison = {
  current: Portfolio;
  previous: Portfolio | null;
  positions: PositionChange[];
  sold: Array<Position & { activity: "SOLD"; shareChange: -100 }>;
  valueChange: number | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`SEC response field ${field} is invalid`);
  }
  return value;
}

function secHeaders(): HeadersInit {
  return {
    Accept: "application/json, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "User-Agent": process.env.SEC_USER_AGENT ?? "Signal13F local-research contact@example.invalid",
  };
}

function submissionRevalidateSeconds(now = new Date()): number {
  const current = now.getTime();
  const year = now.getUTCFullYear();

  for (const window of FILING_WINDOWS) {
    const start = Date.UTC(year, window.month, window.startDay);
    const end = Date.UTC(year, window.month, window.endDay, 23, 59, 59);
    if (current >= start && current <= end) return ACTIVE_WINDOW_REVALIDATE_SECONDS;
    if (current < start) return Math.max(1, Math.ceil((start - current) / 1000));
  }

  const nextWindow = FILING_WINDOWS[0];
  const nextStart = Date.UTC(year + 1, nextWindow.month, nextWindow.startDay);
  return Math.max(1, Math.ceil((nextStart - current) / 1000));
}

function retryDelayMilliseconds(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(1_000, seconds * 1000));
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(30_000, Math.max(1_000, date - Date.now()));
  }
  return 1000 * 2 ** attempt;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function secFetch(url: string, revalidate: number): Promise<Response> {
  for (let attempt = 0; attempt < SEC_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, {
      headers: secHeaders(),
      next: { revalidate },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": revalidate,
          "429": 0,
          "500-599": 0,
        },
      },
    });
    if (response.ok) return response;

    const retryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
    if (retryable && attempt < SEC_MAX_ATTEMPTS - 1) {
      const retryDelay = retryDelayMilliseconds(response, attempt);
      await response.body?.cancel();
      await delay(retryDelay);
      continue;
    }

    await response.body?.cancel();
    throw new Error(`SEC request failed (${response.status}) for ${url}`);
  }

  throw new Error(`SEC request failed after retries for ${url}`);
}

async function getSubmissions(cik: string): Promise<{ name: string; filings: FilingMeta[] }> {
  const response = await secFetch(`${SEC_DATA}/submissions/CIK${cik}.json`, submissionRevalidateSeconds());
  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.name !== "string" || !isRecord(payload.filings) || !isRecord(payload.filings.recent)) {
    throw new Error(`Unexpected SEC submissions response for CIK ${cik}`);
  }

  const recent = payload.filings.recent;
  const columns: FilingColumns = {
    accessionNumber: stringArray(recent.accessionNumber, "accessionNumber"),
    acceptanceDateTime: stringArray(recent.acceptanceDateTime, "acceptanceDateTime"),
    filingDate: stringArray(recent.filingDate, "filingDate"),
    form: stringArray(recent.form, "form"),
    primaryDocument: stringArray(recent.primaryDocument, "primaryDocument"),
    reportDate: stringArray(recent.reportDate, "reportDate"),
  };

  const filings: FilingMeta[] = [];
  for (let index = 0; index < columns.form.length; index += 1) {
    if (columns.form[index] !== "13F-HR" && columns.form[index] !== "13F-HR/A") continue;
    filings.push({
      accessionNumber: columns.accessionNumber[index],
      acceptanceDateTime: columns.acceptanceDateTime[index],
      filingDate: columns.filingDate[index],
      form: columns.form[index],
      primaryDocument: columns.primaryDocument[index],
      reportDate: columns.reportDate[index],
    });
  }
  return { name: payload.name, filings };
}

function archiveBase(cik: string, accessionNumber: string): string {
  return `${SEC_BASE}/Archives/edgar/data/${Number(cik)}/${accessionNumber.replaceAll("-", "")}`;
}

async function findInformationTable(cik: string, filing: FilingMeta): Promise<string> {
  const base = archiveBase(cik, filing.accessionNumber);
  const response = await secFetch(`${base}/index.json`, ARCHIVE_REVALIDATE_SECONDS);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !isRecord(payload.directory) || !Array.isArray(payload.directory.item)) {
    throw new Error(`Unexpected SEC filing index for ${filing.accessionNumber}`);
  }

  const candidates = payload.directory.item
    .filter(isRecord)
    .filter((item) => typeof item.name === "string" && item.name.toLowerCase().endsWith(".xml") && !item.name.toLowerCase().includes("primary_doc"))
    .map((item) => ({ name: String(item.name), size: Number(item.size ?? 0) }))
    .sort((left, right) => right.size - left.size);

  if (!candidates[0]) throw new Error(`No information table found for ${filing.accessionNumber}`);
  return `${base}/${candidates[0].name}`;
}

function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parsePositions(xml: string): Position[] {
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
  const parsed: unknown = parser.parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed.informationTable)) throw new Error("SEC information table XML is invalid");
  const rawTable = parsed.informationTable.infoTable;
  const rows = Array.isArray(rawTable) ? rawTable : rawTable ? [rawTable] : [];
  const grouped = new Map<string, Omit<Position, "weight">>();

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const cusip = text(row.cusip);
    const issuer = text(row.nameOfIssuer);
    const titleOfClass = text(row.titleOfClass);
    const amount = isRecord(row.shrsOrPrnAmt) ? numeric(row.shrsOrPrnAmt.sshPrnamt) : 0;
    const value = numeric(row.value);
    if (!cusip || !issuer) continue;
    const key = `${cusip}:${titleOfClass}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      cusip,
      issuer,
      titleOfClass,
      shares: (existing?.shares ?? 0) + amount,
      value: (existing?.value ?? 0) + value,
    });
  }

  const totalValue = [...grouped.values()].reduce((sum, position) => sum + position.value, 0);
  return [...grouped.values()]
    .map((position) => ({ ...position, weight: totalValue > 0 ? (position.value / totalValue) * 100 : 0 }))
    .sort((left, right) => right.value - left.value);
}

async function getPortfolioForFiling(cik: string, managerName: string, filing: FilingMeta): Promise<Portfolio> {
  const informationTableUrl = await findInformationTable(cik, filing);
  const response = await secFetch(informationTableUrl, ARCHIVE_REVALIDATE_SECONDS);
  const xml = await response.text();
  const positions = parsePositions(xml);
  return {
    cik,
    managerName,
    filing,
    filingUrl: `${archiveBase(cik, filing.accessionNumber)}/${filing.primaryDocument}`,
    positions,
    totalValue: positions.reduce((sum, position) => sum + position.value, 0),
  };
}

export const getLatestPortfolio = cache(async (cik: string): Promise<Portfolio> => {
  const submissions = await getSubmissions(cik);
  const filing = submissions.filings[0];
  if (!filing) throw new Error(`No 13F filings found for CIK ${cik}`);
  return getPortfolioForFiling(cik, submissions.name, filing);
});

export const getPortfolioComparison = cache(async (cik: string): Promise<PortfolioComparison> => {
  const submissions = await getSubmissions(cik);
  const currentFiling = submissions.filings[0];
  if (!currentFiling) throw new Error(`No 13F filings found for CIK ${cik}`);
  const previousFiling = submissions.filings.find((filing) => filing.reportDate !== currentFiling.reportDate);
  const [current, previous] = await Promise.all([
    getPortfolioForFiling(cik, submissions.name, currentFiling),
    previousFiling ? getPortfolioForFiling(cik, submissions.name, previousFiling) : Promise.resolve(null),
  ]);

  const previousByCusip = new Map(previous?.positions.map((position) => [`${position.cusip}:${position.titleOfClass}`, position]) ?? []);
  const currentKeys = new Set<string>();
  const positions: PositionChange[] = current.positions.map((position) => {
    const key = `${position.cusip}:${position.titleOfClass}`;
    currentKeys.add(key);
    const old = previousByCusip.get(key);
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
});

export async function getManagerDashboard() {
  const dashboard: Array<{
    config: Manager;
    portfolio: Portfolio | null;
    error: string | null;
  }> = [];

  for (let offset = 0; offset < managers.length; offset += DASHBOARD_BATCH_SIZE) {
    const batch = managers.slice(offset, offset + DASHBOARD_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((manager) => getLatestPortfolio(manager.cik)));
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      dashboard.push({
        config: batch[index],
        portfolio: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? (result.reason instanceof Error ? result.reason.message : "Unknown SEC error") : null,
      });
    }
  }

  return dashboard;
}

export function formatMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}
