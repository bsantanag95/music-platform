# AGENTS.md

Toda la documentación (producto, dominio, arquitectura, datos) vive en `/docs` —
empezar por `/docs/README.md` antes de tocar código. Código y comentarios en español.

## Comandos

- **Setup:** `cp .env.example .env` (completar `DATABASE_URL` y
  `MUSICBRAINZ_USER_AGENT`), `pnpm install`, `pnpm run db:migrate`, `pnpm run dev`.
- `pnpm run typecheck` — `tsc --noEmit` sobre el proyecto completo, no solo el
  archivo tocado: valida contra `.next/types/` y es lo único que detecta firmas
  viejas de rutas dinámicas de Next 15.
- `pnpm run lint`, `pnpm run build`.
- CI corre, en este orden: `pnpm install --frozen-lockfile && typecheck && lint && test && build`
  (`.github/workflows/ci.yml`). No corre migraciones.
- La verificación de integración manual son los smoke tests en `scripts/`
  (requieren Postgres real vía `DATABASE_URL`; mockean
  `global.fetch`, no salen a internet real):

```bash
  npx tsx --env-file=.env scripts/smoke-test-*.ts
```

`src/db/index.ts` lee `DATABASE_URL` directo de `process.env` — sin
`--env-file=.env` el script falla aunque `.env` exista.
Correr `smoke-test-ingestion.ts` primero: `smoke-test-routes.ts` y otros
necesitan datos ya poblados (ej. un artista "Pink Floyd" existente).

## Base de datos / migraciones

- Migraciones SQL a mano, numeradas en `/drizzle/`, aplicadas en orden por
  `pnpm run db:migrate` y registradas en `_migrations`. **Nunca editar un `.sql`
  ya aplicado** — un cambio de esquema va en un archivo nuevo.
- **No usar `drizzle-kit generate`** (ver ADR 0005); `drizzle.config.ts` solo
  sirve para `drizzle-kit studio` / introspección puntual.
- Cambiar el esquema = nuevo archivo `NNNN_descripcion.sql` + espejo manual en
  `src/db/schema.ts` (que exporta los tipos `*Row` que usa el resto del
  código) + actualizar `docs/03-data/sql-model.md`.
- Tablas en singular y `snake_case`; PK siempre `UUID` (ADR 0003); `mbid` de
  MusicBrainz como columna única para upsert idempotente; `updated_at` lo
  mantiene un trigger — nunca actualizarlo a mano desde la app.
- Reglas de negocio críticas (coherencia estrellas↔detallada, unicidad de
  rating por usuario/objetivo) viven como `CHECK`/índices únicos parciales en
  SQL, no solo en la capa de aplicación — no relajarlas "para simplificar".

## Arquitectura (resumen)

- Patrón central (`src/services/catalog/`, "cacheo bajo demanda"): consultar
  la base propia primero; solo si falta, pedir a MusicBrainz y cachear el
  resultado. Aplica también a artistas "stub" (`type='unknown'`, créditos de
  feat. no visitados aún).
- `src/services/musicbrainz/client.ts` es el **único** punto de salida a
  MusicBrainz: cola de rate limit (≥1.1s entre requests) y exige
  `MUSICBRAINZ_USER_AGENT` o lanza error. No construir URLs de MusicBrainz en
  otro lugar.
- `src/services/cover-art.ts` solo genera miniaturas 250px — nunca resolución
  completa (decisión de licencia documentada en `docs/03-data/data-licensing.md`,
  no solo optimización). No construir URLs de carátula a mano en otro lugar.
- Todo route handler se envuelve con `src/lib/with-error-handling.ts` →
  respuesta uniforme `{ error, code }` ante excepciones no controladas
  (`docs/04-api/errors.md`).
- En Next 15, `params` de rutas dinámicas es `Promise<{ id: string }>` —
  `await params` obligatorio. Ningún smoke test detecta esto si mockea el
  input a mano; solo `tsc --noEmit`/`next build` lo atrapan (ver
  `docs/02-architecture/code-walkthrough.md`).

## Workflow de cambios

- Cambios no triviales se gestionan con OpenSpec: `openspec/` + comandos
  `.opencode/commands/opsx-*` (propose → explore → update → apply → archive).
  Esto planifica el cambio — no sustituye actualizar `/docs`.
- **Toda modificación de código que afecte una regla de negocio
  (`business-rules.md`), el modelo de dominio (`domain-model.md`), un
  contrato de API (`04-api/contracts.md`/`errors.md`) o una decisión de
  arquitectura, debe actualizar ese documento en el mismo cambio, no
  después** — con o sin OpenSpec de por medio.
- Convenciones de nombres/formatos en `docs/02-architecture/conventions.md`;
  decisiones de arquitectura en `docs/02-architecture/adr/` — un ADR nuevo se
  agrega, nunca se reescribe uno existente.
- Si el código y `/docs` contradicen, el código real + el ADR más reciente
  mandan, y la inconsistencia se corrige en la documentación (ver ADR 0006).
- No introducir dependencias nuevas sin justificación explícita en el cambio.

## Antes de dar un cambio por terminado

- [ ] `pnpm run typecheck && pnpm run lint && pnpm run build` pasan.
- [ ] Si se tocó `catalog/` o `musicbrainz/`, se corrió el smoke test relevante
      contra Postgres real.
- [ ] Si se tocó el esquema, hay un `.sql` nuevo (no editado) + `schema.ts`
      sincronizado.
- [ ] Si se tocó un contrato de `/api/catalog/*`, `docs/04-api/contracts.md` y/o
      `errors.md` quedaron actualizados en el mismo cambio.
- [ ] Si el cambio afecta una regla de negocio, el modelo de dominio, un
      contrato de API o una decisión de arquitectura, el documento
      correspondiente en `/docs` quedó actualizado en el mismo cambio.
