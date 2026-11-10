## 1. Datos

- [x] 1.1 Migración `drizzle/0090_artist_link_setlistfm.sql`: rehacer `chk_artist_link_kind` con `setlistfm`; espejo en `src/db/schema.ts`
- [x] 1.2 `curatedArtistLinks`: tipo `setlistfm` desde la relación `setlistfm` activa con host `setlist.fm`, después de streaming; `ArtistLinkKind` ampliado
- [x] 1.3 `buildArtistProfile` deja pasar `setlistfm`
- [x] 1.4 Tests del mapper (Mötley Crüe guarda setlist.fm y no Songkick/Bandsintown, host ajeno descartado, relación terminada) y de la lectura

## 2. Cabecera

- [x] 2.1 `setlistFmSearchUrl(nombre)` en `artist-format.ts` con `URLSearchParams`
- [x] 2.2 `artistFactRows`: fila En vivo después de Enlaces para grupos y personas, con el enlace guardado o la búsqueda; setlist.fm fuera de la fila Enlaces
- [x] 2.3 Mensajes `es`/`en` (`facts.live`, `facts.setlistfm`) y `pnpm run i18n:client-messages` si corresponde
- [x] 2.4 Tests de la ficha: enlace guardado, respaldo por búsqueda (nombre con espacios y acentos), sin fila para varios/desconocido, atributos del enlace

## 3. Documentación

- [x] 3.1 `docs/03-data/sql-model.md` (`artist_link` con `setlistfm`, migración `0090`)
- [x] 3.2 `docs/03-data/data-licensing.md`: setlist.fm solo como enlace, sin su API
- [x] 3.3 `scripts/smoke-test-artist-profile.ts` si verifica los tipos del `CHECK`

## 4. Verificación

- [x] 4.1 Aplicar `0090` en la BD de scratch / local
- [x] 4.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.3 Verificar en el navegador la fila En vivo en un grupo y su ausencia en "Various Artists"
