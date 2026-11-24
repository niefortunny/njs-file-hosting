"use client";

import { formatBytes } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import Image from "next/image";
import { useEffect, useState } from "react";

const PREVIEW_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function FilePanel({ file }: { file: StoredFile }) {
  const [now, setNow] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setOrigin(window.location.origin);
      setNow(Date.now());
    };
    const start = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, []);

  const left = now == null ? null : Date.parse(file.expiresAt) - now;
  const shareLink = `${origin}/f/${file.id}`;
  const expires = new Date(file.expiresAt).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${file.id}`);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError("Nie udało się skopiować linku.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Plik do pobrania</p>
        <h1 className="break-all text-3xl font-semibold tracking-tight">{file.name}</h1>
      </div>

      {PREVIEW_TYPES.has(file.type) && left != null && left > 0 ? (
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-line">
          <Image
            src={`/api/files/${file.id}`}
            alt={file.name}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted">Rozmiar</dt>
        <dd>{formatBytes(file.size)}</dd>
        <dt className="text-muted">Znika</dt>
        <dd>{expires}</dd>
        <dt className="text-muted">Zostało</dt>
        <dd>{left == null ? "…" : formatRemaining(left)}</dd>
      </dl>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={`/api/files/${file.id}`}
          className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
        >
          Pobierz
        </a>
        <button type="button" onClick={copyLink} className="text-sm font-medium text-accent">
          {copied ? "Skopiowano" : "Kopiuj link"}
        </button>
      </div>

      {copyError ? <p className="text-sm text-red-800">{copyError}</p> : null}
      <p className="break-all font-mono text-sm text-muted">{shareLink}</p>
      <p className="text-sm text-muted">Każdy, kto ma ten link, może pobrać plik.</p>
    </div>
  );
}

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "Termin minął";
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours} godz. ${minutes} min ${seconds} s`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}
