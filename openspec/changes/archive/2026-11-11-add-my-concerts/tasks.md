## 1. Datos

- [x] 1.1 Migración `drizzle/0091_concert_entry.sql`: tabla `concert_entry` con `CHECK` de fecha parcial, país, largos, URL de setlist.fm y audiencia, índices `(user_id, event_date DESC)` y `(user_id, artist_id)`, trigger de `updated_at`
- [x] 1.2 Espejo en `src/db/schema.ts` (`concertEntry`, `ConcertEntryRow`) y `docs/03-data/sql-model.md`

## 2. Servicio y API

- [x] 2.1 `src/services/concerts/`: esquemas Zod (fecha real y no futura, país, largos, URL de setlist.fm), alta, edición, baja, lectura propia agrupable por año (con filtro por artista y totales: conciertos, artistas, países), lectura ajena con la matriz de visibilidad de la colección y conteo por artista
- [x] 2.2 Rutas `GET/POST /api/me/concerts`, `PATCH/DELETE /api/me/concerts/[id]`, `GET /api/users/[username]/concerts` con `withErrorHandling` y `await params`; código `CONCERT_NOT_FOUND`
- [x] 2.3 Audiencia por defecto: conciertos en la resolución al crear y en `apply-audience.ts` (vista previa y acción, sin tocar `updated_at`)
- [x] 2.4 Exportación de datos con los conciertos
- [x] 2.5 Tests del servicio y las rutas: validaciones, 401/404, registro ajeno, audiencia por defecto, visibilidad (anónimo, seguidor, privado, bloqueo), orden por fecha parcial, aplicar audiencia, exportación

## 3. Interfaz

- [x] 3.1 Formulario de concierto (diálogo cliente): artista fijo o buscador, fecha con precisión (año / mes / día), `CountryPicker`, ciudad, recinto, gira, enlace a setlist.fm, nota y audiencia; errores por código
- [x] 3.2 Panel del artista: fila En vivo después de Colección con "Registrar" / "Lo viste N veces · Registrar" (cifra en `loadPersonalState`), actualización sin recargar
- [x] 3.3 Página `/me/concerts`: totales, grupos por año, filas con editar / audiencia / quitar con confirmación, filtro `?artista=`, botón "Registrar concierto", estado vacío; entrada en la navegación personal
- [x] 3.4 Perfil: riel Conciertos (hasta 6, total, enlace) y página `/users/[username]/concerts` en modo lectura
- [x] 3.5 Mensajes `es`/`en` y `pnpm run i18n:client-messages`
- [x] 3.6 Tests de componentes y páginas: panel (sin y con registros, anónimo), formulario (precisión de fecha, enlace inválido), página propia (agrupación, filtro, vacío), riel y página ajena

## 4. Documentación

- [x] 4.1 ADR nuevo "Conciertos asistidos como recuerdo de la persona" (D1, enlace futuro opcional, setlist.fm solo como enlace)
- [x] 4.2 `docs/04-api/contracts.md` y `errors.md` (`CONCERT_NOT_FOUND`), `business-rules.md`, `domain-model.md` y la documentación de la biblioteca personal en `docs/05-features`
- [x] 4.3 Smoke test `scripts/smoke-test-concerts.ts` (usuarios `smoke_concert_*` y un artista sintético con MBID `5e0ce000-…`, borrados al terminar) para los `CHECK`, la visibilidad, el orden y la cascada; documentarlo en AGENTS.md

## 5. Verificación

- [x] 5.1 Aplicar `0091` en la BD de scratch
- [x] 5.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 5.3 Verificar en el navegador: registrar desde un artista, Mis conciertos, editar y quitar, riel del perfil como otro visitante
