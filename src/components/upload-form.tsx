"use client";

import { formatBytes, MAX_FILE_BYTES } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import Link from "next/link";
import { useRef, useState, type DragEvent, type FormEvent } from "react";

type UploadResult = StoredFile & { url: string };

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  function takeFile(next: File | null) {
    setFile(next);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0] ?? null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Wybierz plik.");
      return;
    }
    if (file.size === 0) {
      setError("Plik jest pusty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`Limit to ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setProgress(0);

    const body = new FormData();
    body.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (progressEvent) => {
      if (!progressEvent.lengthComputable) return;
      setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
    };
    xhr.onerror = () => {
      setPending(false);
      setProgress(null);
      setError("Nie udało się wysłać pliku.");
    };
    xhr.onload = () => {
      setPending(false);
      setProgress(null);
      const data = parseJson(xhr.responseText);
      if (xhr.status === 201 && data?.url && data.id) {
        setResult(data as UploadResult);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setError(typeof data?.error === "string" ? data.error : "Nie udało się wysłać pliku.");
    };
    xhr.send(body);
  }

  const shareLink = result ? `${window.location.origin}${result.url}` : null;

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Nie udało się skopiować linku.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-5 py-10 text-center ${
          dragging ? "border-accent bg-card" : "border-line bg-card"
        }`}
      >
        <span className="text-sm text-muted">Upuść plik albo wybierz z dysku</span>
        <span className="text-sm text-muted">Do {formatBytes(MAX_FILE_BYTES)}</span>
        <input
          ref={inputRef}
          name="file"
          type="file"
          className="mt-2 max-w-full text-sm"
          disabled={pending}
          onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
        />
      </label>

      {file ? (
        <p className="text-sm">
          {file.name} <span className="text-muted">({formatBytes(file.size)})</span>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Wysyłanie…" : "Wrzuć na dobę"}
      </button>

      {pending ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${progress ?? 0}%` }} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      {result && shareLink ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-sm text-muted">{result.name}</p>
          <p className="mt-2 break-all font-mono text-sm">{shareLink}</p>
          <div className="mt-3 flex gap-4 text-sm font-medium">
            <button type="button" onClick={copyLink} className="text-accent">
              {copied ? "Skopiowano" : "Kopiuj link"}
            </button>
            <Link href={result.url} className="text-accent">
              Otwórz stronę pliku
            </Link>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function parseJson(raw: string): (Partial<UploadResult> & { error?: string }) | null {
  try {
    return JSON.parse(raw) as Partial<UploadResult> & { error?: string };
  } catch {
    return null;
  }
}
