import { XMLParser } from "fast-xml-parser";
import { comparePortfolios, type FilingMeta, type Manager, type Portfolio, type PortfolioSnapshot, type Position } from "./portfolio";

const SEC_BASE = "https://www.sec.gov";
const SEC_DATA = "https://data.sec.gov";
const SEC_MAX_ATTEMPTS = 3;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_XML_BYTES = 24 * 1024 * 1024;
type JsonRecord = Record<string, unknown>;
type FilingColumns = { accessionNumber: string[]; acceptanceDateTime: string[]; filingDate: string[]; form: string[]; primaryDocument: string[]; reportDate: string[] };

function isRecord(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`SEC response field ${field} is invalid`);
  return value;
}
function delay(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
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
async function secFetch(url: string, userAgent: string): Promise<Response> {
  for (let attempt = 0; attempt < SEC_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, { headers: { Accept: "application/json, application/xml, text/xml;q=0.9, */*;q=0.8", "Accept-Encoding": "gzip, deflate", "User-Agent": userAgent } });
    if (response.ok) return response;
    const retryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
    if (retryable && attempt < SEC_MAX_ATTEMPTS - 1) {
      const wait = retryDelayMilliseconds(response, attempt);
      await response.body?.cancel();
      await delay(wait);
      continue;
    }
    await response.body?.cancel();
    throw new Error(`SEC request failed (${response.status}) for ${url}`);
  }
  throw new Error(`SEC request failed after retries for ${url}`);
}
async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maximumBytes) throw new Error(`SEC response exceeds ${maximumBytes} bytes`);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximumBytes) { await reader.cancel(); throw new Error(`SEC response exceeds ${maximumBytes} bytes`); }
    chunks.push(value);
  }
  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(combined);
}
async function readJson(response: Response): Promise<unknown> { return JSON.parse(await readLimitedText(response, MAX_JSON_BYTES)) as unknown; }
async function getSubmissions(cik: string, userAgent: string): Promise<{ name: string; filings: FilingMeta[] }> {
  const payload = await readJson(await secFetch(`${SEC_DATA}/submissions/CIK${cik}.json`, userAgent));
  if (!isRecord(payload) || typeof payload.name !== "string" || !isRecord(payload.filings) || !isRecord(payload.filings.recent)) throw new Error(`Unexpected SEC submissions response for CIK ${cik}`);
  const recent = payload.filings.recent;
  const columns: FilingColumns = {
    accessionNumber: stringArray(recent.accessionNumber, "accessionNumber"), acceptanceDateTime: stringArray(recent.acceptanceDateTime, "acceptanceDateTime"),
    filingDate: stringArray(recent.filingDate, "filingDate"), form: stringArray(recent.form, "form"),
    primaryDocument: stringArray(recent.primaryDocument, "primaryDocument"), reportDate: stringArray(recent.reportDate, "reportDate"),
  };
  const filings: FilingMeta[] = [];
  for (let index = 0; index < columns.form.length; index += 1) {
    if (columns.form[index] !== "13F-HR" && columns.form[index] !== "13F-HR/A") continue;
    filings.push({ accessionNumber: columns.accessionNumber[index], acceptanceDateTime: columns.acceptanceDateTime[index], filingDate: columns.filingDate[index], form: columns.form[index], primaryDocument: columns.primaryDocument[index], reportDate: columns.reportDate[index] });
  }
  return { name: payload.name, filings };
}
function archiveBase(cik: string, accessionNumber: string): string { return `${SEC_BASE}/Archives/edgar/data/${Number(cik)}/${accessionNumber.replaceAll("-", "")}`; }
async function findInformationTable(cik: string, filing: FilingMeta, userAgent: string): Promise<string> {
  const base = archiveBase(cik, filing.accessionNumber);
  const payload = await readJson(await secFetch(`${base}/index.json`, userAgent));
  if (!isRecord(payload) || !isRecord(payload.directory) || !Array.isArray(payload.directory.item)) throw new Error(`Unexpected SEC filing index for ${filing.accessionNumber}`);
  const candidates = payload.directory.item.filter(isRecord)
    .filter((item) => typeof item.name === "string" && item.name.toLowerCase().endsWith(".xml") && !item.name.toLowerCase().includes("primary_doc"))
    .map((item) => ({ name: String(item.name), size: Number(item.size ?? 0) })).sort((left, right) => right.size - left.size);
  if (!candidates[0]) throw new Error(`No information table found for ${filing.accessionNumber}`);
  return `${base}/${candidates[0].name}`;
}
function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") { const parsed = Number(value.replaceAll(",", "")); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
}
function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""; }
function parsePositions(xml: string): Position[] {
  const parsed: unknown = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true }).parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed.informationTable)) throw new Error("SEC information table XML is invalid");
  const rawTable = parsed.informationTable.infoTable;
  const rows = Array.isArray(rawTable) ? rawTable : rawTable ? [rawTable] : [];
  const grouped = new Map<string, Omit<Position, "weight">>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const cusip = text(row.cusip); const issuer = text(row.nameOfIssuer); const titleOfClass = text(row.titleOfClass);
    const amount = isRecord(row.shrsOrPrnAmt) ? numeric(row.shrsOrPrnAmt.sshPrnamt) : 0; const value = numeric(row.value);
    if (!cusip || !issuer) continue;
    const key = `${cusip}:${titleOfClass}`; const existing = grouped.get(key);
    grouped.set(key, { cusip, issuer, titleOfClass, shares: (existing?.shares ?? 0) + amount, value: (existing?.value ?? 0) + value });
  }
  const totalValue = [...grouped.values()].reduce((sum, position) => sum + position.value, 0);
  return [...grouped.values()].map((position) => ({ ...position, weight: totalValue > 0 ? (position.value / totalValue) * 100 : 0 })).sort((left, right) => right.value - left.value);
}
async function getPortfolioForFiling(cik: string, managerName: string, filing: FilingMeta, userAgent: string): Promise<Portfolio> {
  const informationTableUrl = await findInformationTable(cik, filing, userAgent);
  const positions = parsePositions(await readLimitedText(await secFetch(informationTableUrl, userAgent), MAX_XML_BYTES));
  if (positions.length === 0) throw new Error(`No public positions found for ${filing.accessionNumber}`);
  return { cik, managerName, filing, filingUrl: `${archiveBase(cik, filing.accessionNumber)}/${filing.primaryDocument}`, positions, totalValue: positions.reduce((sum, position) => sum + position.value, 0) };
}
export type IngestResult = { status: "updated" | "unchanged"; snapshot: PortfolioSnapshot };
export async function ingestManager(manager: Manager, userAgent: string, existing: PortfolioSnapshot | null): Promise<IngestResult> {
  const submissions = await getSubmissions(manager.cik, userAgent);
  const currentFiling = submissions.filings[0];
  if (!currentFiling) throw new Error(`No 13F filings found for CIK ${manager.cik}`);
  if (existing?.comparison.current.filing.accessionNumber === currentFiling.accessionNumber) return { status: "unchanged", snapshot: existing };
  const current = await getPortfolioForFiling(manager.cik, submissions.name, currentFiling, userAgent);
  let previous: Portfolio | null;
  if (existing && existing.comparison.current.filing.reportDate !== currentFiling.reportDate) previous = existing.comparison.current;
  else if (existing) previous = existing.comparison.previous;
  else {
    const previousFiling = submissions.filings.find((filing) => filing.reportDate !== currentFiling.reportDate);
    previous = previousFiling ? await getPortfolioForFiling(manager.cik, submissions.name, previousFiling, userAgent) : null;
  }
  return { status: "updated", snapshot: { version: 1, updatedAt: new Date().toISOString(), comparison: comparePortfolios(current, previous) } };
}
