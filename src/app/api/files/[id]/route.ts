import { contentDisposition, allowRequest, clientIp } from "@/lib/guards";
import { getFile, readBlob } from "@/lib/files";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json({ error: "Za dużo żądań. Spróbuj za chwilę." }, { status: 429 });
  }

  const { id } = await context.params;
  const meta = await getFile(id);
  if (!meta) {
    return NextResponse.json({ error: "Plik nie istnieje albo wygasł." }, { status: 404 });
  }

  const bytes = await readBlob(meta.id);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": meta.type || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": contentDisposition(meta.name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
