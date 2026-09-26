## Context

`AlbumCredits` recibe los niveles de personal y, aparte, `songwriters` (autoría de obras),
ambos con `artistId`, roles y pistas. El primer nivel (`levels.members`) se renderiza con
`LevelList`/`CreditRow`; los demás con `CollapsibleLevel`, cuyo resumen es "N · tres
nombres" (o "+N créditos" en Arte y otros). La nota "Créditos según MusicBrainz." es texto
plano. `getAlbumPersonnel` ya resuelve la edición representativa (solo su `id`), y
`site-links.ts` expone `musicBrainzReleaseUrl(mbid)`, que la pestaña Ediciones ya usa para
enlazar a MusicBrainz.

## Goals / Non-Goals

**Goals:** los cuatro requisitos de la spec, sin cambios de datos, ingesta ni API, y con la
pestaña renderizada en el servidor, sin JavaScript de cliente.

**Non-Goals:** quitar integrantes de Composición, cambiar la vista Por canción, cambiar
niveles o la regla de contracción.

## Decisions

### D1. El cruce integrante ↔ autoría se hace en el componente, por `artistId`

`PeopleView` arma un `Map<artistId, SongwriterEntry>` a partir de `songwriters` y se lo pasa
a la `LevelList` del primer nivel; `CreditRow` recibe un `authorship?: CreditEntry`
opcional y, si existe, dibuja una tercera línea: roles de autoría formateados con el mismo
`useRoleFormatter` (que ya traduce `writer`/`composer`/`lyricist`) y `TrackRefs`. La línea
lleva un prefijo accesible ("Composición:") solo para lectores de pantalla, porque
visualmente las etiquetas "música, letra" ya lo dicen.

- *Alternativa descartada:* calcularlo en `getAlbumPersonnel`. Ambos datos ya llegan al
  componente y el cruce es trivial; agregar un campo al read-model duplicaría información.

### D2. El resumen de Composición cuenta integrantes con el mismo conjunto de ids

Con `leadKind === "group"` y al menos una autora en `levels.members`, el resumen usa textos
nuevos: `songwritingSummaryMembers` ("{count} · {members, plural, one {# integrante} other
{# integrantes}} + {names}"), su variante con "y {rest} más", y `songwritingSummaryAllMembers`
("{count} · todas integrantes"). Las autoras externas se nombran en el orden de la sección
(mayor participación primero). Con un artista principal persona no se usa: "1 integrante"
sería la propia solista y confunde.

### D3. Resumen con roles para niveles de hasta 3 personas

`CollapsibleLevel` decide el resumen: con `entries.length <= SUMMARY_NAMES` (3, la misma
constante que ya limita los nombres del resumen) cada persona se muestra como "Nombre (primer
rol)", separadas por " · ", usando el primer elemento de `formatRoles` (que ya viene
ordenado por nivel y por peso). La regla vale para todos los niveles contraídos; en
Composición cede ante D2 cuando hay integrantes. Se reutiliza la constante para que "el
resumen ya nombra a todos" y "el resumen muestra roles" nunca diverjan.

- *Alternativa descartada:* dejar abiertos los niveles cortos. Contradice la regla de
  "todo contraído salvo el primer nivel" que se acaba de fijar.
- *Alternativa descartada:* todos los roles de cada persona. Con productores que también
  mezclan y graban, el resumen deja de caber en una línea.

### D4. MBID de la edición en el read-model y enlace con `musicBrainzReleaseUrl`

`getAlbumPersonnel` selecciona también `release.mbid` de la representativa y lo expone como
`AlbumPersonnel.releaseMbid`; la página lo pasa a `AlbumCredits`. La nota se arma con
`t.rich("source", { link })`: la palabra "MusicBrainz" es el enlace, con `target="_blank"`,
`rel="noopener noreferrer"` y el aviso de pestaña nueva en el nombre accesible, igual que el
enlace de la pestaña Ediciones. Sin MBID, la nota queda como texto.

## Risks / Trade-offs

- [El primer rol puede no ser el más representativo] → `formatRoles` ya ordena por nivel
  (producción primero en Producción y sonido) y por peso de intérprete, así que el primero
  es el que define a la persona en ese nivel.
- [La línea de autoría alarga las filas de integrantes] → Solo aparece cuando hay autoría y
  usa el estilo secundario (texto chico y apagado) de la línea de pistas.
- [Resumen de Composición con muchas autoras externas] → Se limita a tres nombres más "y N
  más", igual que el resto de los niveles.
