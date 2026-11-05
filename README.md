# Doba

Szkielet anonimowego hostingu plików. Plik żyje 24 godziny, potem znika. Bez kont. Link jest jedynym hasłem.

Frontend jest gotowy. Zapis na dysk i endpointy dopisujecie wy, każdy swoim pull requestem.

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

Da się iść równolegle. Osoba od dysku i osoba od API umawiają się pierwsze na nazwach funkcji, reszta woła gotowe funkcje zamiast czytać katalog `data/` z komponentu.

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

Odhaczajcie punkt w tym pliku w tym samym PR, który go robi. Komponentów formularza i strony pliku nie przepisujcie.

### Frontend

- [x] Formularz wysyła `POST /api/upload` polem `file` (`XMLHttpRequest`, bo `fetch` nie daje postępu wysyłki)
- [x] Przed wysyłką odrzuca brak pliku, pusty plik i plik ponad `MAX_FILE_BYTES`
- [x] Przy błędzie pokazuje `error` z JSON, przy `201` link `origin + url` i kopiowanie
- [x] Strona `/f/[id]` woła `getFile`; `null` to jeden komunikat dla braku i wygaśnięcia
- [x] Przy metadanych: nazwa, rozmiar, data, odliczanie, kopiowanie, pobranie przez `<a href="/api/files/:id">`
- [x] Podgląd tylko dla JPEG, PNG, GIF i WebP

### Dysk — gałąź `feature/storage`

Plik: `src/lib/files.ts`. Typ z `src/lib/types.ts`, limit z `MAX_FILE_BYTES`. `getFile` już jest i zwraca `null`: podmień ciało, nie zmieniaj sygnatury. Dopisz `saveFile(file: File): Promise<StoredFile>`.

- [ ] Katalog `data/` przy zapisie (`fs.mkdir` z `recursive: true`), pliki poza `public/`
- [ ] Id: `randomBytes(12).toString("base64url")`. Przy odczycie tylko `^[A-Za-z0-9_-]{16}$`, zanim złożycie ścieżkę
- [ ] Nazwa: ostatni człon po `/` i `\`, bez znaków spoza liter, cyfr, kropki, spacji i myślnika. Pusta nazwa → `"plik"`
- [ ] Bajty do `data/<id>.bin`, JSON do `data/<id>.json`. Najpierw plik tymczasowy, potem `rename`, na końcu JSON. `expiresAt` = teraz + 24 godziny
- [ ] `getFile` czyta JSON. Po terminie albo bez bajtów kasuje oba pliki i zwraca `null`
- [ ] Przy uploadzie kasuje z `data/` metadane, którym minął termin
- [ ] Zapis przez `file.arrayBuffer()`. Powyżej 100 MB dopiero strumień, nie sam wyższy limit
- [ ] Mały skrypt w `scripts/`: czysta funkcja „czy termin minął” na dacie z przeszłości i z przyszłości, odpalana przez `node`

### API — gałąź `feature/api`

Pliki: `src/app/api/upload/route.ts`, `src/app/api/files/[id]/route.ts`. Walidacja w route, zapis w `src/lib/files.ts`. Błędy zostają `{ error: string }`.

- [ ] `formData()`, pole `file` jest `File`. Brak pola albo rozmiar `0` → `400`. Ponad `MAX_FILE_BYTES` → `413`
- [ ] `content-length` wyraźnie ponad limit (z zapasem kilkudziesięciu KB na multipart) → `413` jeszcze przed `formData()`
- [ ] Reszta idzie do `saveFile`, odpowiedź `201` z polami `StoredFile` i `url: "/f/" + id`
- [ ] Pobranie: `await context.params`, potem `getFile`. `null` → `404`
- [ ] Strumień `createReadStream` + `Readable.toWeb`, nagłówki `Content-Type`, `Content-Length`, `Content-Disposition: attachment` (`filename*`, UTF-8), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`
- [ ] HTML i SVG też schodzą jako załącznik
- [ ] Limit liczby żądań z jednego IP, osobnym PR-em

Kolejność: najpierw dysk (`getFile` i `saveFile`), potem API. Formularz już pokazuje `error` z odpowiedzi, także przy obecnym `501`.
