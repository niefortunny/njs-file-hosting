import { UploadForm } from "@/components/upload-form";
import { formatBytes, MAX_FILE_BYTES } from "@/lib/format";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Wrzuć plik na dobę</h1>
        <p className="text-lg leading-7 text-muted">
          Bez konta. Link jest jedynym hasłem. Plik znika po 24 godzinach. Limit {formatBytes(MAX_FILE_BYTES)}.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
