import { MAX_FILE_BYTES } from "./format.ts";

const WINDOW_MS = 60_000;
const MAX_HITS = 30;
const hits = new Map<string, number[]>();

export function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_-]{16}$/.test(id);
}

export function sanitizeName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^\p{L}\p{N}. -]/gu, "")
    .replace(/^\.+/, "")
    .slice(0, 120)
    .trim();
  return cleaned || "plik";
}

export function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function declaredBodyTooLarge(request: Request): boolean {
  const declared = Number(request.headers.get("content-length"));
  const overhead = 64 * 1024;
  return Number.isFinite(declared) && declared > MAX_FILE_BYTES + overhead;
}

/** ponytail: licznik w pamięci procesu, znika po restarcie. Przy wielu instancjach trzeba współdzielonego store. */
export function allowRequest(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    const oldest = hits.keys().next().value;
    if (oldest) hits.delete(oldest);
  }
  return true;
}
