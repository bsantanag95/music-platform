## Context

`membership` (migraciones `0000` y `0006`) guarda una fila por par persona ↔ grupo, con `role`
(los atributos de MusicBrainz unidos por coma), `joined_on` y `left_on` (`date`), único por
par y con el trigger `trg_membership_types` que exige persona → grupo. `ensureArtistMemberships`
(`ingest-artist.ts`) la llena una sola vez por artista (`memberships_synced_at`) desde
`getArtistWithRelations` (`inc=artist-rels+url-rels`), fusiona las relaciones del mismo par con
`mergeMembershipDates` y guarda la ficha en la misma request (`enrich-artist-profile`). La
ficha se renueva cada 30 días (`syncArtistProfileFacts`), pero las pertenencias no. Leen
`membership`: la franja "También en" (`artist-also-in.ts`), la discografía de una persona
(`ingest-discography.ts`), los niveles de créditos del álbum (`personnel-levels.ts`, para
separar integrantes de invitados) y `GET /api/catalog/artist/{id}`.

Verificación en vivo con Mötley Crüe (2026-09-28), relaciones de artista:

| Tipo de relación | Cantidad | Ejemplo |
|---|---|---|
| `member of band` | 14 | Vince Neil · lead vocals, original · 1981-01-17 – 1992 (terminó) |
| `instrumental supporting musician` | 6 | Samantha Maloney · drums (drum set) · 2000 – 2002 |
| `supporting musician` | 1 | (grupo tributo mal cargado, sin atributos) |
| `tribute` | 11 | — |

Vince Neil tiene tres relaciones (1981–1992, 1997–2015, 2018–), Tommy Lee suma teclados en
2018, DJ Larceny no tiene fechas ni marca de terminado. La documentación de MusicBrainz define
el apoyo como "apoyo instrumental de largo plazo en álbumes y/o en conciertos"; sus únicos
atributos son el instrumento (o el tipo de voz) y las fechas.

Decisiones de producto ya tomadas (exploración del 2026-09-28): pestaña Integrantes al estilo
de Metal-Archives; "Músicos de apoyo" como un solo grupo (sin separar en vivo de estudio,
porque el dato no lo distingue); período desconocido cuando no hay fechas; las otras bandas
de cada integrante como gancho de navegación; separar datos e interfaz en dos cambios.

## Goals / Non-Goals

**Goals:**

- Guardar la alineación completa de MusicBrainz sin perder períodos, instrumentos ni marcas.
- Guardar músicos de apoyo, también de solistas.
- Mantener la alineación al día sin requests extra.
- Tener las otras bandas y la fecha de muerte de cada integrante sin bloquear la página y
  sin acaparar la cola de MusicBrainz.
- No romper a quienes hoy leen `membership`.

**Non-Goals:**

- La interfaz (pestaña, cabecera, formato de períodos): `add-artist-members-tab`.
- Músicos de sesión derivados de los créditos de personal de los álbumes (opción descartada
  por ahora: su cobertura depende de qué álbumes se visitaron).
- Relaciones `tribute`, `subgroup`, `founder`, `conductor position` y similares.
- Wikimedia para los integrantes sincronizados en segundo plano (llega al visitarlos).

## Decisions

### D1. `membership` sigue siendo el par; los períodos van en una tabla hija

Tabla nueva `membership_period`, una fila por relación `member of band`:
`membership_id` (FK con `ON DELETE CASCADE`), `begin_date` y `end_date` (texto con fecha
parcial, mismo `CHECK` que `artist.life_begin`), `ended` (`boolean NOT NULL`), `instruments`
(`text[] NOT NULL DEFAULT '{}'`, atributos crudos de MusicBrainz sin las marcas),
`is_founder` y `is_additional` (`boolean NOT NULL DEFAULT false`, desde `original` y
`additional`). `CHECK`: el año de fin no es anterior al de inicio.

`membership.role`, `joined_on` y `left_on` quedan como **resumen derivado** de sus períodos
(unión ordenada de instrumentos; fechas con `mergeMembershipDates`), así la discografía, los
niveles de créditos y la API siguen igual. `role` deja de incluir `original` y `additional`.

*Alternativa descartada:* quitar la unicidad del par y guardar varias filas en
`membership`. Obliga a deduplicar en cada consumidor (niveles de créditos, "También en",
discografía de una persona) y el resumen se recalcularía en cada lectura.

Una relación con fin anterior al inicio (dato incoherente) se guarda sin fechas, como hoy:
no se inventa una fecha ni se viola el `CHECK`.

### D2. Músicos de apoyo en su propia tabla, sin restricción de tipos

Tabla nueva `artist_support`, una fila por relación de apoyo: `musician_id` y `artist_id`
(FK a `artist` con `ON DELETE CASCADE`, distintos entre sí), `kind` (`instrumental` |
`vocal` | `general`, según el tipo de relación), `instruments` (instrumentos o tipos de voz
crudos), `begin_date`, `end_date`, `ended`. Índices por `musician_id` y por `artist_id`. Sin
unicidad: la sincronización reemplaza las filas de su alcance (D3).

No va en `membership` porque el artista apoyado puede ser una persona (la banda de gira de un
solista), lo que viola `trg_membership_types`, y porque los niveles de créditos tratan a toda
fila de `membership` como integrante: un baterista de gira pasaría a "Integrantes" en los
créditos del álbum.

### D3. Alcance de la sincronización por lado

Las relaciones de MusicBrainz son simétricas: la de Vince Neil con Mötley Crüe aparece en
ambos artistas. Cada sincronización reemplaza solo su lado:

- **Grupo G**: los pares de `membership` con `group_id = G` (y sus períodos) y las filas de
  `artist_support` con `artist_id = G`.
- **Persona P**: los pares con `person_id = P` (y sus períodos) y las filas de
  `artist_support` con `musician_id = P` o `artist_id = P` (apoyo que da y que recibe).

Los períodos de un par se reemplazan completos con los de la relación vista desde el lado que
sincroniza; como el dato es el mismo, no hay conflicto entre lados. Los artistas relacionados
que no existen entran como stub con su tipo (`upsertArtistFromMb`, igual que hoy).

Una función `saveArtistLineup(tx, artist, detail)` hace esto y la usan la sincronización fría
(`ensureArtistMemberships`) y la actualización (D4).

### D4. La alineación se renueva con la ficha, en la misma request

Columna nueva `artist.lineup_synced_at`. `syncArtistProfileFacts` ya pide
`getArtistWithRelations`; ahora también llama a `saveArtistLineup` y escribe
`lineup_synced_at`. Un artista necesita actualización si su ficha tiene más de 30 días,
nunca se sincronizó, o `lineup_synced_at` es `NULL` (sincronizado antes de este cambio). Así el
primer paso tras el deploy sale solo con las visitas, y el backfill (D8) lo adelanta.

`memberships_synced_at` conserva su papel: indica que la sincronización fría ya pasó.

### D5. Clasificación de la alineación: función pura

`classifyLineup(entries, group)` sobre los períodos ya leídos:

- **Actual**: la persona tiene algún período abierto (sin fin y sin la marca de terminado).
  Un período sin fechas y sin terminar cuenta como abierto (criterio de MusicBrainz) y se marca
  con período desconocido. Una persona fallecida (`life_ended`) no tiene períodos abiertos:
  Randy Castillo (†2002) figura en MusicBrainz con una pertenencia a Stone Fury sin fin ni
  marca de terminado, y no puede ser integrante actual.
- **Antiguo**: todos sus períodos terminaron.
- **Última alineación**: si el grupo terminó (`life_ended`), en lugar de Actual van quienes
  tienen un período que termina en el año de fin del grupo o sigue abierto; el resto es
  Antiguo. Sin año de fin del grupo, solo quienes siguen abiertos. Al mostrarse, esos períodos
  abiertos terminan con el grupo (Gilmour en Pink Floyd: 1968–2014, no "1968–presente").
- **Apoyo actual / anterior**: el mismo criterio sobre `artist_support`. En un grupo terminado,
  todo el apoyo es anterior.
- **Orden** dentro de cada grupo: fundadores primero, luego por el año del primer período, los
  sin año al final, y por nombre para desempatar.
- **Instrumentos por períodos**: cada instrumento reúne los períodos en que aparece; los
  instrumentos con el mismo conjunto de períodos forman una línea (Tommy Lee: batería en
  tres períodos; coros, teclados y piano en uno). Las líneas se ordenan por su primer período.
  Antes se unen las relaciones con las mismas fechas: MusicBrainz a veces carga una por
  instrumento (Los Bunkers: guitarra y voz 1999–2014 por separado).

La traducción de instrumentos y el formato de los años son de la interfaz.

### D6. Sincronización de integrantes en segundo plano, con tope

`scheduleLineupMembersSync(artistId)` programa con `after()`, al mostrar la alineación de un
grupo (o de un solista con músicos de apoyo), la sincronización de sus integrantes y músicos
de apoyo con MBID cuya alineación está pendiente o vencida (D4). Por cada persona hace lo mismo que la actualización de D4 (ficha y
alineación en una request), **sin Wikimedia**. De ahí salen sus otras bandas y su fecha de
muerte (`life_end` de la ficha).

- **Tope de 10 personas por visita**. La cola de MusicBrainz es global al proceso (≥1,1 s entre
  requests): 10 personas ocupan unos 11 s, lo que acota cuánto espera una ingesta en primer
  plano de otro usuario. Mötley Crüe (14 personas) se completa en dos visitas.
- Prioridad: actuales, luego antiguos, luego apoyo, en el orden de D5.
- Una sola sincronización por artista a la vez en cada instancia (un registro en memoria; si ya
  corre, se omite). No se usa un candado de PostgreSQL que dure toda la corrida porque ocuparía
  una conexión del pool (5) durante ~11 s. Entre instancias, cada persona se sincroniza bajo el
  candado de su ficha, que relee la vigencia: dos corridas simultáneas nunca repiten la request
  de una misma persona, y una visita a esa persona tampoco.
- Fuera de una request de Next (scripts) se omite, como `scheduleArtistProfileRefresh`.
- Un fallo con una persona se registra y sigue con la siguiente.

*Alternativa descartada:* sincronizar al visitar cualquier pestaña del grupo. La cabecera solo
necesita los nombres de la alineación actual, que ya vienen de la sincronización del grupo; la
línea de otras bandas solo se ve en la pestaña Integrantes (o Bandas, para los músicos de apoyo
de un solista).

### D7. Lectura para la interfaz

`getArtistLineup(artistId)` lee solo de PostgreSQL:

- **Grupo**: integrantes y músicos de apoyo clasificados (D5), cada uno con nombre, tipo, año de
  muerte si terminó, marcas y líneas de instrumentos; y sus **otras afiliaciones**: sus demás
  grupos (actual o "ex-", según sus períodos) y los artistas a los que da apoyo, sin el grupo
  que se está viendo. Se leen en lote por los ids de las personas (una consulta por tabla).
  Incluye la cantidad de personas cuya alineación sigue pendiente, para el aviso de la
  interfaz.
- **Persona**: sus grupos con sus períodos (con la foto y la cantidad de discos principales del
  grupo, como hoy `getAlsoInGroups`), los artistas a los que da apoyo y sus propios músicos de
  apoyo (solistas con banda de gira), estos últimos con sus otras afiliaciones.

### D8. Backfill y smoke test

`scripts/backfill-artist-lineup.ts` ejecuta la actualización de D4 sobre los artistas con
`memberships_synced_at` y sin `lineup_synced_at`, con `--limit` y `--dry-run`, en serie por la
cola de MusicBrainz. `scripts/smoke-test-artist-lineup.ts` usa el prefijo sintético
`5e0ce000-0000-4000-8000-*`, mockea MusicBrainz y borra sus datos al terminar.

## Risks / Trade-offs

- **Cola de MusicBrainz ocupada por la sincronización de integrantes** → tope de 10 por visita y
  un solo proceso por grupo; se sincroniza solo desde la pestaña Integrantes.
- **Stubs en masa**: sincronizar a los integrantes crea stubs de todas sus bandas → es el mismo
  patrón que ya aplican los créditos; un stub no cuesta requests hasta que alguien lo visita.
- **Calidad del dato de MusicBrainz** (el fin de 2015 de la gira de despedida de Mötley Crüe, la
  salida de Mick Mars en 2022 en lugar de 2023, apoyo menos completo que en Metal-Archives) → se
  muestra tal cual, como el resto del catálogo.
- **Resumen duplicado en `membership`** → se escribe siempre en la misma transacción que los
  períodos y nadie lo edita a mano.

## Migration Plan

1. `drizzle/0055_artist_lineup.sql`: `membership_period`, `artist_support`,
   `artist.lineup_synced_at`. Aditiva: la BD de scratch es compartida con otros worktrees.
2. Deploy: las visitas renuevan la alineación; el backfill adelanta a los artistas ya visitados.
3. Rollback: el código anterior ignora las tablas nuevas; `membership` conserva su forma.
