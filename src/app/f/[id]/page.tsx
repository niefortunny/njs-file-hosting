import { FilePanel } from "@/components/file-panel";
import { getFile } from "@/lib/files";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getFile(id);

  if (!file) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Tego pliku już nie ma</h1>
        <p className="text-muted">Link wygasł albo nigdy nie istniał.</p>
        <Link href="/" className="text-sm font-medium text-accent">
          Wrzuć nowy
        </Link>
      </div>
    );
  }

  return <FilePanel file={file} />;
}
