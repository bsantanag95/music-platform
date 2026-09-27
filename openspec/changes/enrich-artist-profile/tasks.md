## 1. Preparación

- [ ] 1.1 Redactar el ADR 0021 (Wikimedia como fuente del perfil de artista, design.md D1) y actualizar `docs/03-data/data-licensing.md` (Wikidata CC0, texto de Wikipedia CC BY-SA 4.0, fotos de Commons con licencia por archivo y crédito obligatorio)
- [ ] 1.2 Guardar como fixtures de test respuestas reales recortadas: lookup de artista de MusicBrainz con `url-rels+genres` (Pink Floyd, Kuervos del Sur, Mon Laferte), `wbgetentities`, TextExtracts en es y en, `imageinfo` con `extmetadata` (dominio público, CC BY-SA y un archivo no libre)

## 2. Esquema

- [ ] 2.1 Crear la migración (número a confirmar al implementar): columnas de ficha, foto y sincronización en `artist`, renombre `bio` → `disambiguation`, tablas `artist_genre`, `artist_link` y `artist_localized_text` con sus `CHECK` (design.md D4)
- [ ] 2.2 Espejar en `src/db/schema.ts` y adaptar las lecturas de `bio` (`search/artists.ts`, `search/suggest.ts`, `ingest-artist.ts` y demás)
- [ ] 2.3 Actualizar `docs/03-data/sql-model.md`
- [ ] 2.4 Aplicar la migración en la BD de scratch

## 3. Ficha desde MusicBrainz

- [ ] 3.1 `getArtistWithRelations` con `inc=artist-rels+url-rels+genres` y tipos de `area`, `begin-area`, `end-area`, `life-span`, `genres` y relaciones de URL
- [ ] 3.2 Mappers puros: fechas parciales, géneros con votos, enlaces curados en orden fijo con prioridad de streaming, id de Wikidata desde la relación `wikidata`
- [ ] 3.3 Guardar ficha, géneros y enlaces en la misma sincronización que las pertenencias (una sola request)
- [ ] 3.4 Tests de mappers y de la sincronización (una request, reemplazo de géneros y enlaces)

## 4. Cliente de Wikimedia

- [ ] 4.1 `src/services/wikimedia/client.ts`: `WIKIMEDIA_USER_AGENT` obligatorio (fail-closed), cola serial, `maxlag`; métodos para entidades, etiquetas, TextExtracts por idioma e `imageinfo` con miniatura de 500 px
- [ ] 4.2 Agregar `WIKIMEDIA_USER_AGENT` a `.env.example` y documentarlo; nota en `AGENTS.md` sobre el nuevo punto de salida externo
- [ ] 4.3 Tests del cliente: User-Agent faltante, URLs y parámetros, serialización

## 5. Enriquecimiento

- [ ] 5.1 Foto: P18 → `imageinfo`; lista permitida de licencias, rechazo de `NonFree`, autor sin HTML, enlaces a licencia y archivo; respeta `photo_blocked_at` (design.md D5, D9)
- [ ] 5.2 Descripción y resumen por idioma (es, en) desde sitelinks y TextExtracts `exintro` en texto plano; lectura con respaldo al otro idioma y su idioma de origen (design.md D6)
- [ ] 5.3 Lugar: P19 o P740 según tipo, etiquetas del lugar y su país en es y en, respaldo `begin_area_name` (design.md D7)
- [ ] 5.4 Orquestación en segundo plano: TTL de 30 días, candado por artista, cada paso escribe por separado y un fallo conserva los datos previos; quitar la foto si el archivo se borró o cambió de licencia (design.md D8)
- [ ] 5.5 Lectura del perfil para la página: ficha, géneros ordenados, enlaces, texto por idioma y foto con crédito
- [ ] 5.6 Tests: cada escenario de los specs (Kuervos del Sur sin artículo en inglés, Mon Laferte con lugar de nacimiento en otro país, miniatura no libre ignorada, licencia rechazada, Wikimedia caído, foto borrada, artista sin relación `wikidata`)

## 6. Operación

- [ ] 6.1 `scripts/backfill-artist-profile.ts` con `--limit` y `--dry-run`
- [ ] 6.2 `scripts/takedown-artist-photo.ts` (vaciar y marcar `photo_blocked_at`; opción para quitar la marca)
- [ ] 6.3 Documentar ambos scripts en `docs/06-operations/catalog-scripts.md`

## 7. Contratos

- [ ] 7.1 Tipo `Artist` y `GET /api/catalog/artist/{id}` con `disambiguation` y los datos nuevos; actualizar `docs/04-api/contracts.md`
- [ ] 7.2 Revisar las superficies que muestran `photoUrl` (artistas seguidos, Exploración) con fotos reales: tamaño, recorte y `alt`

## 8. Verificación

- [ ] 8.1 Smoke test `scripts/smoke-test-artist-profile.ts` con fixtures de MusicBrainz y Wikimedia mockeados y MBID sintéticos; limpieza al terminar y su nota en `AGENTS.md`
- [ ] 8.2 Correr el smoke test contra la BD de scratch con `ALLOW_SMOKE_ON_REAL_DB=1`
- [ ] 8.3 Backfill real de una muestra en la BD de scratch (Pink Floyd, Los Bunkers, Kuervos del Sur, Mon Laferte, Sabrina Carpenter) y revisar los datos guardados
- [ ] 8.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
