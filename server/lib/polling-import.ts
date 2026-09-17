import { createHash } from "crypto";
import { isIP } from "net";
import { lookup } from "dns/promises";
import { and, desc, eq, max } from "drizzle-orm";
import { db } from "../db";
import {
  externalPolls,
  pollingImportErrors,
  pollingImportRuns,
  pollingSources,
  type PollingSource,
} from "@shared/schema";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const MAX_ROWS = 10_000;

type RawRow = Record<string, unknown>;

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "::" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  if (address.startsWith("::ffff:")) return isPrivateAddress(address.slice(7));
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || parts[0] === 0
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || parts[0] >= 224;
}

export async function validatePollingSourceUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Source URL is invalid");
  }
  if (url.protocol !== "https:") throw new Error("Source URL must use HTTPS");
  if (url.username || url.password) throw new Error("Source URL cannot include credentials");
  if (url.port && url.port !== "443") throw new Error("Source URL must use the standard HTTPS port");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("Private or local source URLs are not allowed");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Source hostname resolves to a private or unavailable address");
  }
  return url;
}

async function fetchBoundedText(initialUrl: string): Promise<{ text: string; contentType: string; finalUrl: string }> {
  let url = await validatePollingSourceUrl(initialUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json, text/csv, text/plain;q=0.8", "User-Agent": "ACP-Polling-Importer/1.0" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("Source redirected too many times");
      url = await validatePollingSourceUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Source response exceeds the 5 MB limit");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Source returned an empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Source response exceeds the 5 MB limit");
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
    return {
      text: new TextDecoder().decode(combined),
      contentType: response.headers.get("content-type")?.toLowerCase() || "",
      finalUrl: url.toString(),
    };
  }
  throw new Error("Unable to fetch source");
}

function parseCsv(text: string): RawRow[] {
  const records: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); records.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (field || row.length) { row.push(field); records.push(row); }
  if (records.length < 2) return [];
  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("CSV headers cannot be blank");
  return records.slice(1)
    .filter((values) => values.some((value) => value.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function parseRows(text: string, format: string, contentType: string): RawRow[] {
  if (format === "json") {
    if (contentType && !contentType.includes("json") && !contentType.includes("text/plain")) {
      throw new Error(`Expected JSON but received ${contentType}`);
    }
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed?.polls;
    if (!Array.isArray(rows)) throw new Error('JSON must be an array or an object with a "polls" array');
    return rows;
  }
  if (contentType && !contentType.includes("csv") && !contentType.includes("text/plain") && !contentType.includes("octet-stream")) {
    throw new Error(`Expected CSV but received ${contentType}`);
  }
  return parseCsv(text);
}

function value(row: RawRow, ...keys: string[]): unknown {
  const normalized = new Map(Object.entries(row).map(([key, val]) => [key.toLowerCase().replace(/[\s_-]/g, ""), val]));
  for (const key of keys) {
    const found = normalized.get(key.toLowerCase().replace(/[\s_-]/g, ""));
    if (found !== undefined && found !== "") return found;
  }
}

function requiredText(row: RawRow, label: string, ...keys: string[]): string {
  const found = value(row, ...keys);
  if (typeof found !== "string" && typeof found !== "number") throw new Error(`${label} is required`);
  const text = String(found).trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function optionalDate(row: RawRow, ...keys: string[]): Date | null {
  const found = value(row, ...keys);
  if (found === undefined || found === null || found === "") return null;
  const date = new Date(String(found));
  if (Number.isNaN(date.getTime())) throw new Error(`${keys[0]} must be a valid date`);
  return date;
}

function parseResults(row: RawRow): Record<string, number> {
  const raw = value(row, "results");
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try { candidate = JSON.parse(raw); } catch { throw new Error("results must be a JSON object"); }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    candidate = Object.fromEntries(Object.entries(row)
      .filter(([key]) => /^result[_\s-]/i.test(key))
      .map(([key, val]) => [key.replace(/^result[_\s-]*/i, ""), Number(val)]));
  }
  const entries = Object.entries(candidate as Record<string, unknown>);
  if (!entries.length) throw new Error('results is required (JSON object or "result_<name>" CSV columns)');
  const results: Record<string, number> = {};
  for (const [name, rawValue] of entries) {
    const number = Number(rawValue);
    if (!name.trim() || !Number.isFinite(number) || number < 0 || number > 100) {
      throw new Error("each result must have a name and a number from 0 to 100");
    }
    results[name.trim()] = number;
  }
  return results;
}

function normalizeRow(row: RawRow, source: PollingSource, finalUrl: string) {
  const pollster = requiredText(row, "pollster", "pollster", "pollsterName");
  const race = requiredText(row, "race", "race", "raceName", "contest");
  const geography = requiredText(row, "geography", "geography", "state", "district");
  const results = parseResults(row);
  const sampleRaw = value(row, "sampleSize", "sample", "n");
  const sampleSize = sampleRaw === undefined ? null : Number(sampleRaw);
  if (sampleSize !== null && (!Number.isInteger(sampleSize) || sampleSize <= 0)) throw new Error("sampleSize must be a positive integer");
  const normalized = {
    sourceRecordKey: value(row, "id", "sourceRecordKey", "pollId")?.toString() || null,
    pollster, race, geography, results,
    question: value(row, "question")?.toString() || null,
    methodology: value(row, "methodology", "method")?.toString() || null,
    sampleSize,
    fieldStartDate: optionalDate(row, "fieldStartDate", "startDate"),
    fieldEndDate: optionalDate(row, "fieldEndDate", "endDate"),
    publishedDate: optionalDate(row, "publishedDate", "date"),
    sourceUrl: value(row, "sourceUrl", "url")?.toString() || finalUrl,
  };
  const fingerprint = createHash("sha256").update(JSON.stringify({
    sourceId: source.id,
    sourceRecordKey: normalized.sourceRecordKey,
    pollster, race, geography,
    fieldEndDate: normalized.fieldEndDate?.toISOString() || null,
    results,
  })).digest("hex");
  return { ...normalized, fingerprint };
}

export async function runPollingImport(runId: string, source: PollingSource): Promise<void> {
  try {
    await db.update(pollingImportRuns).set({ status: "running", startedAt: new Date() }).where(eq(pollingImportRuns.id, runId));
    const fetched = await fetchBoundedText(source.endpointUrl);
    const rows = parseRows(fetched.text, source.format, fetched.contentType);
    if (rows.length > MAX_ROWS) throw new Error(`Source exceeds the ${MAX_ROWS.toLocaleString()} row limit`);
    await db.update(pollingImportRuns).set({ totalRows: rows.length }).where(eq(pollingImportRuns.id, runId));
    let importedRows = 0, duplicateRows = 0, errorRows = 0;
    for (let index = 0; index < rows.length; index++) {
      try {
        const normalized = normalizeRow(rows[index], source, fetched.finalUrl);
        const prior = await db.select({ id: externalPolls.id }).from(externalPolls)
          .where(and(eq(externalPolls.sourceId, source.id), eq(externalPolls.fingerprint, normalized.fingerprint))).limit(1);
        if (prior.length) duplicateRows++;
        else {
          let version = 1;
          if (normalized.sourceRecordKey) {
            const [latest] = await db.select({ version: max(externalPolls.version) }).from(externalPolls)
              .where(and(eq(externalPolls.sourceId, source.id), eq(externalPolls.sourceRecordKey, normalized.sourceRecordKey)));
            version = (latest?.version ?? 0) + 1;
          }
          await db.insert(externalPolls).values({ ...normalized, version, sourceId: source.id, importRunId: runId, rawPayload: rows[index] });
          importedRows++;
        }
      } catch (error: any) {
        errorRows++;
        await db.insert(pollingImportErrors).values({
          importRunId: runId, rowNumber: index + 2, message: error.message || "Invalid row", rawRow: rows[index],
        });
      }
      await db.update(pollingImportRuns).set({ currentRow: index + 1, importedRows, duplicateRows, errorRows }).where(eq(pollingImportRuns.id, runId));
    }
    await db.update(pollingImportRuns).set({ status: "completed", completedAt: new Date() }).where(eq(pollingImportRuns.id, runId));
    await db.update(pollingSources).set({ lastImportedAt: new Date(), updatedAt: new Date() }).where(eq(pollingSources.id, source.id));
  } catch (error: any) {
    await db.update(pollingImportRuns).set({
      status: "failed", errorMessage: error.message || "Import failed", completedAt: new Date(),
    }).where(eq(pollingImportRuns.id, runId));
  }
}

export async function getPollingAdminOverview() {
  const [sources, runs, polls] = await Promise.all([
    db.select().from(pollingSources).orderBy(desc(pollingSources.createdAt)),
    db.select().from(pollingImportRuns).orderBy(desc(pollingImportRuns.createdAt)).limit(25),
    db.select().from(externalPolls).orderBy(desc(externalPolls.createdAt)).limit(100),
  ]);
  return { sources, runs, polls };
}