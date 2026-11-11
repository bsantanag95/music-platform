## 1. Datos

- [x] 1.1 Migración `drizzle/0093_community_concert.sql`: en `concert` `created_by` (`SET NULL`), `setlistfm_url` (`CHECK` de setlist), `city_key` (columna generada con `search_key`), `confirmed_at`, `merged_into_id` (`SET NULL`); `CHECK` de comunitario (ciudad y país), fusionado ⇒ oculto; índice por `(created_by, created_at)` para el límite; `content_report.concert_id` (`CASCADE`, único parcial abierto) y su `CHECK` de objetivo; `moderation_action.concert_id` (`SET NULL`), acción `merge` y su `CHECK`
- [x] 1.2 Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`

## 2. Creación y confirmación

- [x] 2.1 `src/services/concerts/community.ts`: requisitos de cuenta, límite de 24 h, plausibilidad contra la actividad, nombre por defecto, duplicado exacto con `advisory lock`, creación + asistencia (crea o enlaza el recuerdo, también el de "Compartir este concierto")
- [x] 2.2 Confirmación: personas que cuentan, prueba de setlist.fm (artista y año), pegajosa; reevaluar al crear, al asistir y en la fusión
- [x] 2.3 Candidatos (±1 día, mismo artista, ciudad normalizada primero)
- [x] 2.4 Lecturas: "Por confirmar" en la pestaña y página con sesión (faltan N), fuera de cifras; "Registrado por" en confirmados; redirección de fusionados
- [x] 2.5 Sincronización de MusicBrainz: fusión automática de comunitarios coincidentes
- [x] 2.6 Rutas `POST /api/concerts`, `GET /api/concerts/candidates`; códigos `CONCERT_DUPLICATE`, `CONCERT_IMPLAUSIBLE`, `CONCERT_CREATE_NOT_ALLOWED`, `CONCERT_CREATE_LIMIT`
- [x] 2.7 Tests del servicio y las rutas

## 3. Moderación

- [x] 3.1 `POST /api/concerts/[id]/report` y su servicio (motivos, único abierto)
- [x] 3.2 Acciones ocultar / restaurar / fusionar con auditoría y resolución de reportes; fusión reutilizada por la sincronización
- [x] 3.3 Cola de moderación: reportes de conciertos con sus acciones
- [x] 3.4 Tests

## 4. Interfaz

- [x] 4.1 Formulario "Agregar un concierto" (diálogo): candidatos primero, después artista(s) del cartel con rol, fecha exacta, recinto, ciudad, país, nombre y setlist; errores por código
- [x] 4.2 Pestaña: botón con sesión y sección "Por confirmar" con "Faltan N confirmaciones"
- [x] 4.3 Página: aviso y `noindex` si está por confirmar, "Registrado por", "Reportar" con motivo
- [x] 4.4 Mis conciertos: "Compartir este concierto" en recuerdos elegibles
- [x] 4.5 Mensajes `es`/`en`, `pnpm run i18n:client-messages` y tests de componentes

## 5. Documentación

- [x] 5.1 ADR nuevo "Confirmación comunitaria de conciertos" (umbral, prueba externa, pegajosa, visibilidad, crédito)
- [x] 5.2 `contracts.md`, `errors.md`, `business-rules.md`, `domain-model.md`, `docs/05-features/my-concerts.md`
- [x] 5.3 Smoke test `scripts/smoke-test-community-concerts.ts` (usuarios `smoke_cc_*`, artistas sintéticos `5e0ce000-…`): `CHECK`, requisitos y límite, plausibilidad, duplicado con pedidos simultáneos, confirmación (3 personas, cuentas que no cuentan, setlist), visibilidad con y sin sesión, fusión manual y automática, reportes; documentarlo en AGENTS.md

## 6. Verificación

- [x] 6.1 Aplicar `0093` en la BD de scratch
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.3 Verificar en el navegador: crear desde la pestaña de un artista sin conciertos, candidatos, por confirmar, confirmar con otras cuentas, reportar y fusionar
