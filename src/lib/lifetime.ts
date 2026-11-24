import { promises as fs } from "node:fs";
import path from "node:path";
import { isValidId } from "./guards.ts";

export const TTL_MS = 24 * 60 * 60 * 1000;

export function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

export function expiresAt(now = Date.now()): string {
  return new Date(now + TTL_MS).toISOString();
}

export function isExpired(expiresAtValue: string, now = Date.now()): boolean {
  const time = Date.parse(expiresAtValue);
  return Number.isNaN(time) || time <= now;
}

async function removeStored(id: string): Promise<void> {
  const dir = dataDir();
  await fs.rm(path.join(dir, `${id}.bin`), { force: true });
  await fs.rm(path.join(dir, `${id}.json`), { force: true });
  await fs.rm(path.join(dir, `${id}.part`), { force: true });
}

/** ponytail: pełny skan katalogu przy każdym uploadzie. Przy dużym data/ przenieść do crona. */
export async function purgeExpired(now = Date.now()): Promise<number> {
  let names: string[];
  try {
    names = await fs.readdir(dataDir());
  } catch {
    return 0;
  }

  let removed = 0;
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -".json".length);
    if (!isValidId(id)) continue;

    let expires = "";
    try {
      const raw = await fs.readFile(path.join(dataDir(), name), "utf8");
      expires = (JSON.parse(raw) as { expiresAt?: string }).expiresAt ?? "";
    } catch {
      continue;
    }
    if (!isExpired(expires, now)) continue;
    await removeStored(id);
    removed += 1;
  }
  return removed;
}

export { removeStored };
