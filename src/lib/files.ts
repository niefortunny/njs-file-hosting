import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isValidId, sanitizeName } from "./guards.ts";
import { dataDir, expiresAt, isExpired, purgeExpired, removeStored } from "./lifetime.ts";
import type { StoredFile } from "./types.ts";

const HARD_MAX_BYTES = 100 * 1024 * 1024;

function blobPath(id: string): string {
  return path.join(dataDir(), `${id}.bin`);
}

function metaPath(id: string): string {
  return path.join(dataDir(), `${id}.json`);
}

async function readMeta(id: string): Promise<StoredFile | null> {
  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    const meta = JSON.parse(raw) as StoredFile;
    if (meta.id !== id) return null;
    return meta;
  } catch {
    return null;
  }
}

export async function saveFile(file: File): Promise<StoredFile> {
  if (file.size > HARD_MAX_BYTES) {
    throw new Error("Plik jest za duży, żeby trzymać go w pamięci.");
  }

  const id = randomBytes(12).toString("base64url");
  const now = Date.now();
  const meta: StoredFile = {
    id,
    name: sanitizeName(file.name),
    size: file.size,
    type: file.type || "application/octet-stream",
    createdAt: new Date(now).toISOString(),
    expiresAt: expiresAt(now),
  };

  await fs.mkdir(dataDir(), { recursive: true });
  const part = path.join(dataDir(), `${id}.part`);
  await fs.writeFile(part, Buffer.from(await file.arrayBuffer()));
  await fs.rename(part, blobPath(id));
  await fs.writeFile(metaPath(id), JSON.stringify(meta));
  await purgeExpired();
  return meta;
}

export async function getFile(id: string): Promise<StoredFile | null> {
  if (!isValidId(id)) return null;
  const meta = await readMeta(id);
  if (!meta) return null;
  if (isExpired(meta.expiresAt)) {
    await removeStored(id);
    return null;
  }
  try {
    await fs.access(blobPath(id));
  } catch {
    await removeStored(id);
    return null;
  }
  return meta;
}

export function readBlob(id: string): Promise<Buffer> {
  return fs.readFile(blobPath(id));
}
