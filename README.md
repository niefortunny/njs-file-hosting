# Doba

Anonimowy hosting plików. Wrzucasz plik, dostajesz link, po 24 godzinach plik znika. Bez kont. Link jest jedynym hasłem.

## Uruchomienie

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) — wrzucanie.  
Po wysłaniu dostajesz link `/f/<id>`. Pobranie idzie z `/api/files/<id>`.

```bash
npm run check
```

Sprawdza termin, nazwę, id, limit żądań oraz zapis i skasowanie po terminie. Pliki testowe lądują w katalogu tymczasowym, nie w `data/`.

Wgrane pliki są w `data/` (katalog jest w `.gitignore`), poza `public/`. Opcjonalnie `DATA_DIR` zmienia ten katalog.

## Kontrakt

Metadane (`StoredFile`):

```ts
{
  id: string;        // 16 znaków, A–Z a–z 0–9 _ -
  name: string;      // sama nazwa pliku, bez ścieżki
  size: number;
  type: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO, createdAt + 24h
}
```

`POST /api/upload`, pole formularza `file`:

- `201` i `{ ...StoredFile, url: "/f/<id>" }`
- `400` `{ error: string }` gdy brak pliku albo plik pusty
- `413` `{ error: string }` gdy plik większy niż 25 MB (`MAX_FILE_BYTES`)
- `429` `{ error: string }` po więcej niż 30 żądaniach z jednego IP w ciągu minuty

`GET /api/files/:id`:

- `200` i bajty pliku, nagłówek `Content-Disposition: attachment`
- `404` `{ error: string }` gdy id jest złe, pliku nie ma albo termin minął — jedna odpowiedź na te trzy przypadki
- `429` jak przy uploadzie

Nie ma listy plików. Kto nie ma linku, ten nie wie, że plik istnieje.

## Gdzie co leży

| Ścieżka | Rola |
| --- | --- |
| `src/components/upload-form.tsx` | wybór, upuszczenie, postęp, błąd, link |
| `src/components/file-panel.tsx` | nazwa, rozmiar, odliczanie, kopiowanie, podgląd obrazka |
| `src/app/api/upload/route.ts` | odbiór pliku |
| `src/app/api/files/[id]/route.ts` | pobranie |
| `src/lib/files.ts` | `saveFile`, `getFile` |
| `src/lib/lifetime.ts` | 24 godziny i czyszczenie `data/` |
| `src/lib/guards.ts` | id, nazwa, nagłówek pobrania, limit żądań |
| `src/lib/format.ts` | `MAX_FILE_BYTES` (25 MB) i `formatBytes` |

Podgląd na stronie pliku jest tylko dla JPEG, PNG, GIF i WebP. HTML i SVG schodzą jako załącznik.

Limit 30 żądań na minutę siedzi w pamięci procesu i znika po restarcie. Zapis czyta cały plik do RAM, dlatego twardy sufit to 100 MB.

## Lista zadań

### 1. Wrzuć plik

- [x] Formularz wysyła pole `file` przez `XMLHttpRequest` (postęp wysyłki)
- [x] Przed wysyłką odrzuca brak pliku, pusty plik i plik ponad `MAX_FILE_BYTES`
- [x] Przy błędzie pokazuje `error` z JSON, przy `201` link `origin + url` i kopiowanie
- [x] `saveFile`: katalog `data/`, bajty w `data/<id>.bin`, JSON w `data/<id>.json`, najpierw plik tymczasowy, potem `rename`
- [x] Id z `randomBytes(12)`, nazwa z `sanitizeName`, termin z `expiresAt`
- [x] Route: brak albo pusty plik → `400`, za duży → `413`, sukces → `201` i `url: "/f/" + id`

### 2. Otwórz i pobierz

- [x] Strona woła `getFile`. `null` to jeden komunikat: link wygasł albo nigdy nie istniał
- [x] Przy metadanych: nazwa, rozmiar, data, odliczanie, kopiowanie, link pobrania
- [x] Podgląd tylko dla JPEG, PNG, GIF i WebP
- [x] `getFile` czyta JSON, przy złym id, braku albo minionym terminie kasuje pliki i zwraca `null`
- [x] Route: `null` → `404`, inaczej bajty pliku z `Content-Length`
- [x] Nagłówki: `attachment`, `Content-Length`, `nosniff`, `Cache-Control: private, no-store`

### 3. 24 godziny

- [x] `expiresAt(now)` → ISO, teraz + 24 godziny
- [x] `isExpired` → minął albo data jest zła
- [x] `purgeExpired()` przy każdym `saveFile`
- [x] `getFile` kasuje parę plików, gdy termin minął
- [x] `npm run check` woła `isExpired` bez zostawiania plików w `data/`

### 4. Nazwa, id i limity

- [x] `isValidId`: 16 znaków `A-Za-z0-9_-`, zanim ścieżka jest składana
- [x] `sanitizeName`: ostatni człon ścieżki, reszta znaków wycięta, puste → `"plik"`
- [x] `contentDisposition`: `attachment` i `filename*` w UTF-8
- [x] `content-length` wyraźnie ponad limit → `413` jeszcze przed `formData()`
- [x] Limit 30 żądań z jednego IP na minutę, na upload i pobranie
