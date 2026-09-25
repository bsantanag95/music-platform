## Context

`AlbumCredits` (Server Component) recibe `Record<PersonnelLevel, PersonnelEntry[]>` de
`getAlbumPersonnel` y pinta cuatro niveles; solo "Arte y otros" va en `<details>`.
`formatRoles` muestra, para `instrument`/`vocal`, cada atributo como un rol, así que
`["additional","keyboard"]` produce "adicional, teclados". Datos reales observados:
`instrument ["membranophone"]`, `programming ["membranophone"]`, `producer ["co"]`,
`vocal ["additional","background vocals"]`, tipos `arranger` e `instrument arranger`.
`getAlbumPersonnel` ya lee el `type` de los artistas principales para tratar al solista
como integrante, pero no lo devuelve.

## Goals / Non-Goals

Ver `proposal.md`.

## Decisions

### D1. `leadKind` en la lectura

`getAlbumPersonnel` devuelve `{ levels, leadKind }` con `leadKind = "person"` cuando todos
los artistas principales son `type = 'person'`, y `"group"` en otro caso (incluye
colaboraciones mixtas y tipos desconocidos). El rótulo "Artista principal" se pluraliza por
la cantidad de entradas del nivel. Alternativa descartada: calcularlo en la página con
`AlbumDetail` — no trae el tipo de artista y la consulta ya existe en el servicio.

### D2. Contracción por umbral, sin JavaScript

Invitados y Producción usan `<details>` con `open` cuando el nivel tiene ≤ 6 personas
(constante `LEVEL_OPEN_MAX = 6`). El `<summary>` lleva el rótulo del nivel, la cantidad y,
contraído, los tres primeros nombres en el orden ya existente (más participación primero).
El primer nivel no usa `<details>`. Todo sigue siendo Server Component.

### D3. Filas compactas

Nombre en la columna izquierda; en la derecha, los roles en una línea y las pistas en otra.
Con más de 4 roles, se muestran 4 y un `<details>` en línea "+N" despliega el resto
(`ROLES_VISIBLE = 4`).

### D4. Modificadores de rol

En `credit-roles.ts`, conjunto `MODIFIERS = {additional, guest, solo, co, executive,
assistant}`:
- `instrument`/`vocal`: se separan modificadores e instrumentos. `additional` y `guest` se
  descartan (el nivel ya dice si es invitado; "adicional" no aporta en una ficha). `solo` se
  agrega como matiz: "guitarra (solo)". Sin instrumentos (solo modificadores) se usa el tipo
  ("voz").
- Otros tipos: si existe la clave compuesta `roles.<tipo>_<modificador>` se usa
  ("producer_co" → "coproducción"); si no, "tipo (matiz)" como hoy.
- Deduplicación final por etiqueta, conservando el orden.

`membranophone` se traduce como "percusión" (es la familia de tambores; "membranófonos" no
lo entiende nadie), así `programming ["membranophone"]` queda "programación (percusión)" y
se deduplica con "percusión".

## Risks / Trade-offs

- Descartar `additional` pierde un matiz → aceptable: la ficha prioriza qué tocó cada uno.
- Un nivel contraído esconde nombres → el resumen muestra cantidad y los tres principales,
  y abrirlo es un clic.

## Migration Plan

Solo lectura y UI; sin migración.

## Open Questions

Ninguna.
