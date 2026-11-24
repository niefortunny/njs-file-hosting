import { allowRequest, clientIp, declaredBodyTooLarge } from "@/lib/guards";
import { MAX_FILE_BYTES } from "@/lib/format";
import { saveFile } from "@/lib/files";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function tooMany() {
  return NextResponse.json({ error: "Za dużo żądań. Spróbuj za chwilę." }, { status: 429 });
}

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) return tooMany();
  if (declaredBodyTooLarge(request)) {
    return NextResponse.json({ error: "Plik jest za duży." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nie da się odczytać formularza." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Plik jest pusty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Plik jest za duży." }, { status: 413 });
  }

  const meta = await saveFile(file);
  return NextResponse.json({ ...meta, url: `/f/${meta.id}` }, { status: 201 });
}
