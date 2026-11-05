# Doba

Szkielet anonimowego hostingu plików. Plik żyje 24 godziny, potem znika. Bez kont. Link jest jedynym hasłem.

Frontend jest gotowy. Zapis na dysk i endpointy dopisujemy każdy swoim pull requestem.

## Uruchomienie

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) — formularz wrzucania.
[http://localhost:3000/f/test](http://localhost:3000/f/test) — strona pliku. Dopóki `getFile` zwraca `null`, widać komunikat o braku pliku.
`POST /api/upload` i `GET /api/files/test` zwracają `501`, więc formularz pokazuje „Niezaimplementowane.”

## Co już jest

| Ścieżka | Stan |
| --- | --- |
| `src/components/upload-form.tsx` | wybór, upuszczenie, postęp, błąd, link |
| `src/app/page.tsx` | strona wrzucania |
| `src/components/file-panel.tsx` | nazwa, rozmiar, odliczanie, kopiowanie, podgląd obrazka |
| `src/app/f/[id]/page.tsx` | woła `getFile` |
| `src/lib/files.ts` | `getFile` zwraca `null` — tu wchodzi zapis |
| `src/lib/format.ts` | `MAX_FILE_BYTES` (25 MB) i `formatBytes` |
| `src/app/api/upload/route.ts` | `POST` → 501 |
| `src/app/api/files/[id]/route.ts` | `GET` → 501 |
| `src/lib/types.ts` | wspólny kształt metadanych |

Katalog `data/` jest w `.gitignore`. Tam mają lądować pliki, nie w `public/`.

## Praca na pull requestach

`main` zostaje pniem. Jeden PR = jedna rola z listy niżej.

```bash
git checkout main
git pull
git checkout -b feature/krotka-nazwa
```

W opisie PR napiszcie, co kliknęliście albo jakie żądanie wysłaliście. Nie zmieniajcie kontraktu po cichu. `src/lib/types.ts` ruszacie tylko, gdy cała czwórka się zgodzi.

Cztery osoby, cztery ścieżki. Każda domyka swoje pliki i nie przepisuje cudzych. Wspólne są tylko `src/lib/types.ts` i sygnatury `saveFile` / `getFile`.

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
- `413` `{ error: string }` gdy plik większy niż limit (na start 25 MB)

`GET /api/files/:id`:

- `200` i bajty pliku, nagłówek `Content-Disposition: attachment`
- `404` `{ error: string }` gdy id jest złe, pliku nie ma albo termin minął — jedna odpowiedź na te trzy przypadki

Nie róbcie listy plików. Kto nie ma linku, ten nie wie, że plik istnieje.

## Lista zadań

Odhaczacie punkt w tym samym PR, który go robi. Każdy rusza tylko swoje pliki.

### 1. Wrzuć plik — `feature/upload`

Od przycisku do pliku na dysku. Pliki: `src/components/upload-form.tsx`, `src/app/page.tsx`, `src/app/api/upload/route.ts`, funkcja `saveFile` w `src/lib/files.ts`.

- [x] Formularz wysyła pole `file` przez `XMLHttpRequest` (postęp wysyłki)
- [x] Przed wysyłką odrzuca brak pliku, pusty plik i plik ponad `MAX_FILE_BYTES`
- [x] Przy błędzie pokazuje `error` z JSON, przy `201` link `origin + url` i kopiowanie
- [ ] `saveFile`: katalog `data/` (`fs.mkdir`, `recursive`), bajty w `data/<id>.bin`, JSON w `data/<id>.json`, najpierw plik tymczasowy, potem `rename`. Zapis przez `file.arrayBuffer()`, nie powyżej 100 MB
- [ ] Id: `randomBytes(12).toString("base64url")`. Nazwę i „czy id jest bezpieczne” bierzecie od osoby 4, termin od osoby 3. Zanim te funkcje wejdą, nazwa to ostatni człon ścieżki, `expiresAt` to teraz + 24 godziny
- [ ] Route: `formData()`, pole `file` jest `File`. Brak albo rozmiar `0` → `400`, ponad limit → `413`, sukces → `201` z `StoredFile` i `url: "/f/" + id`

### 2. Otwórz i pobierz — `feature/download`

Od linku do bajtów. Pliki: `src/components/file-panel.tsx`, `src/app/f/[id]/page.tsx`, `src/app/api/files/[id]/route.ts`, funkcja `getFile` w `src/lib/files.ts`.

- [x] Strona woła `getFile`. `null` to jeden komunikat: link wygasł albo nigdy nie istniał
- [x] Przy metadanych: nazwa, rozmiar, data, odliczanie, kopiowanie, `<a href="/api/files/:id">`
- [x] Podgląd tylko dla JPEG, PNG, GIF i WebP
- [ ] `getFile` czyta JSON i sprawdza, że plik bajtów leży obok. Złe id, brak albo miniony termin → `null` i skasowane pliki. Czy termin minął, mówi funkcja osoby 3. Czy id wolno złożyć w ścieżkę, mówi funkcja osoby 4
- [ ] Route: `await context.params`, potem `getFile`. `null` → `404`. Inaczej strumień `createReadStream` + `Readable.toWeb`
- [ ] Nagłówki pobrania bierzecie od osoby 4 (`Content-Disposition` i reszta). Zanim wejdą: `attachment`, `Content-Length`, `nosniff`, `Cache-Control: private, no-store`. HTML i SVG też jako załącznik

### 3. 24 godziny — `feature/lifetime`

Sam czas życia, bez formularza i bez route. Pliki: `src/lib/lifetime.ts`, `scripts/`. W `files.ts` dopisujecie tylko wywołania, nie ciało zapisu i odczytu.

- [ ] `expiresAt(now)` → ISO, teraz + 24 godziny
- [ ] `isExpired(expiresAt, now)` → minął albo data jest zła
- [ ] `purgeExpired()` kasuje z `data/` pary `.bin` + `.json`, którym minął termin. Osoba 1 woła to na końcu `saveFile`
- [ ] Osoba 2 w `getFile` woła `isExpired` i przy `true` kasuje oba pliki
- [ ] `scripts/`: `node` sprawdza `isExpired` na dacie z przeszłości i z przyszłości, bez zapisu na dysk

### 4. Nazwa, id i limity — `feature/guards`

Same reguły na granicy z internetem. Pliki: `src/lib/guards.ts`. W route dopisujecie tylko wywołania.

- [ ] `isValidId`: dokładnie 16 znaków `A-Za-z0-9_-`. Osoba 2 woła to, zanim złoży ścieżkę
- [ ] `sanitizeName`: ostatni człon po `/` i `\`, znaki spoza liter, cyfr, kropki, spacji i myślnika wycięte, puste → `"plik"`. Osoba 1 woła to przy zapisie
- [ ] `contentDisposition(name)`: `attachment`, nazwa w `filename*` jako UTF-8. Osoba 2 wstawia to w nagłówek pobrania
- [ ] W upload route, zanim `formData()`: `content-length` wyraźnie ponad `MAX_FILE_BYTES` (zapas kilkudziesięciu KB na multipart) → `413`
- [ ] Limit liczby żądań z jednego IP na `POST /api/upload` i `GET /api/files/:id`

Osoba 1 i 2 mogą iść od razu na tymczasowych regułach z ich list. Osoba 3 i 4 dokładają własne funkcje, a tamci podmieniają tymczasowe wywołania w jednym małym PR.
