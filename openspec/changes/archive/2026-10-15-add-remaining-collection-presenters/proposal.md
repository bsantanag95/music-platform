## Why

`add-collection-presenters` (ADR 0039) dejó el mecanismo y dos casos reales: Premios y Novedades esenciales. Las otras seis
colecciones generadas siguen con la cartela de su familia, que dice poco o nada de por qué esos discos están ahí:
"Lo que viene" muestra una fecha suelta, "Un disco por década" un año, "Para entrar a Punk y hardcore" un año sin decir
que es un disco por era, y los dos rankings de la comunidad muestran el año del disco en vez de la cifra que los puso en
el ranking (la valoración promedio o el número de reseñas). Es justo lo que el cambio anterior prometió dejar para cuando
el contrato estuviera probado.

## What Changes

Un presentador propio para cada plantilla que hoy cae a su familia:

- **`upcoming` (Lo que viene):** resumen con el rango real de fechas, cartela de cuenta regresiva ("Sale en 9 días · 24 oct",
  "Sale mañana") y los discos agrupados por mes, del más cercano al más lejano.
- **`anniversaries` (Cumplen años en …):** resumen con el mes del período y el rango de años que cumplen, y el aniversario
  calculado contra el **año del período** (no el de hoy), de modo que una colección archivada diga la edad que tenía entonces.
- **`genre-spotlight` (Para entrar a …):** resumen que dice la regla ("un disco por cada era de 5 años de {género}, del más
  antiguo al más reciente") y cartela con la era a la que representa cada disco ("Era 1990–1994 · 1992").
- **`one-per-decade` (Un disco por década):** resumen que dice la regla y cartela con su década ("Década de 1990 · 1994").
- **`top-rated-quarter` (Mejor valorados del trimestre):** resumen con el trimestre y el mínimo de valoraciones, y cartela
  con la cifra que lo ubica ahí ("★ 4,5 · 12 valoraciones"), numerados.
- **`most-reviewed-month` (Lo más reseñado del mes):** resumen con el mes y cartela con su número de reseñas del mes
  ("12 reseñas"), numerados.

Cambios de apoyo:

- Un helper puro de fechas relativas generalizado a pasado y futuro, compartido por Novedades y Lo que viene.
- Lectura por lote de las cifras de los rankings (valoraciones y reseñas del período del propio ranking, no de todo el
  tiempo).
- Los textos nuevos en `catalog.explore.collectionContext`, en los dos idiomas.

Fuera de alcance, explícitamente:

- Cambiar el contrato `CollectionContext` o el registro: este cambio solo usa lo que ya existe. Si algún presentador lo
  exigiera, se pausa y se discute.
- Cambiar cómo se generan, ordenan o rotan las colecciones (`plan()` no cambia).
- Filtros interactivos, agrupación por década o por era en la rejilla (la cartela dice la década o la era sin partir los
  discos en secciones de uno).
- Las tarjetas del riel y de la página de colecciones.
- Migraciones de esquema.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `collection-presenters`: cada plantilla generada tiene presentador propio; se especifican los seis casos nuevos.

## Impact

- **Servicios:** nuevos presentadores en `src/services/discovery/collections/presenters/` y su registro
  (`TEMPLATE_PRESENTERS`); lectura por lote de cifras de ranking.
- **Mensajes:** nuevas claves en `catalog.explore.collectionContext` (es/en), registradas en `CONTEXT_MESSAGE_KEYS`.
- **UI y API:** ninguna; el detalle ya pinta lo que resuelve el registro.
- **Docs:** `docs/05-features/explore.md` y la tabla de presentadores del ADR 0039 (nota de seguimiento, sin reescribirlo).
- **Pruebas:** unitarias de cada presentador con fecha de hoy inyectable y del cálculo de períodos; el smoke test ejecuta
  los presentadores reales contra la base de scratch.
