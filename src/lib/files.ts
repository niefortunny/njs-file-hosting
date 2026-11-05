import type { StoredFile } from "@/lib/types";

// Osoba od dysku podmienia ciało. Sygnatura zostaje: null = brak albo po terminie.
export async function getFile(id: string): Promise<StoredFile | null> {
  if (id.length === 0) return null;
  return null;
}
