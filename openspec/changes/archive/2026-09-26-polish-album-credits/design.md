## Context

La pestaña Créditos (`src/components/album/AlbumCredits.tsx`) arma cada fila con
`formatRoles` (`credit-roles.ts`), que traduce tipos y atributos con fallback al texto de
MusicBrainz. Los roles de una persona llegan de `personnel-levels.ts` ya ordenados por tipo
de relación según el nivel (`sortRolesForLevel`: producción primero en Producción y sonido),
pero dentro de los intérpretes se respeta el orden de MusicBrainz, que no refleja peso. Las
pistas llegan como `"all"` o como una lista ordenada de `{ recordingId, discNumber, position }`;
`TrackRefs` las enlaza una por una. El total de pistas de la edición ya está disponible en
el componente (`tracks`, usado para los títulos). Los niveles contraídos son `<details>`
sueltos con `mt` entre ellos; Arte y otros usa un `<summary>` distinto.

Inventario real (base de prueba, 2026-09-26): atributos sin traducción `associate`, `grand
piano`, `guitar synthesizer`, `bass synthesizer`, `bass pedals`, `Moog`, `oboe`, `cor
anglais`, `electric piano`, `shakers`, `brass`, `timbales`, `congas`, `other vocals`,
`prepared piano`, `lap steel guitar`, `continuum`, `Hammond organ`, `resonator guitar`; tipos
sin traducción `video director`, `remixer`, `orchestrator`, `instrument technician`,
`artists and repertoire`, `video appearance`, `cinematographer`, `lacquer cut`.

## Goals / Non-Goals

**Goals:** los cuatro puntos del proposal, sin cambiar datos, API ni ingesta, y sin estado
en el cliente (la pestaña sigue siendo render de servidor con `<details>`).

**Non-Goals:** autoría en la fila de integrantes, ancho del bloque de integrantes, enlace de
atribución, cambios en la vista Por canción más allá de heredar traducciones y orden.

## Decisions

### D1. El orden por peso vive en `formatRoles`, sobre las etiquetas ya formadas

`formatRoles` ya recorre cada rol y expande los atributos de instrumento/voz en etiquetas
individuales. Ahí se asigna un peso a cada etiqueta de intérprete a partir de su atributo
crudo: 0 voz principal / voz sin especificar, 1 instrumento (por defecto), 2 voces de apoyo
(`background vocals`, `choir vocals`, `other vocals`), 3 percusión menor (`percussion`,
`membranophone`, `idiophone`, `tambourine`, `shakers`, `handclaps`, `bell`, `congas`,
`timbales`, `whistling`). Luego se reordena **solo la subsecuencia de etiquetas de
intérprete**, en las posiciones que ya ocupaban, con orden estable; las etiquetas de otros
tipos quedan donde estaban. Así no se pisa `sortRolesForLevel`.

- *Alternativa descartada:* ordenar en `sortRolesForLevel` sobre `PersonnelRole`. Un rol
  `instrument` puede traer varios atributos ("guitar", "percussion") en una sola relación,
  así que el peso es por atributo, no por rol; ordenar roles no alcanza.
- *Alternativa descartada:* ordenar por cantidad de pistas por rol. Los roles no llevan sus
  pistas (se agregan por persona) y no distingue batería de percusión cuando ambas cubren
  todo el disco.

La lista de pesos es cerrada y chica; un instrumento desconocido cae en 1, que es el caso
correcto para la gran mayoría.

### D2. Pistas: función pura que produce segmentos, render en `TrackRefs`

Nueva función pura en `credit-roles.ts`, `compactTracks(tracks, total)`, que devuelve
`{ kind: "except", tracks } | { kind: "list", segments }`, donde cada segmento es una pista
o un rango `{ from, to }`. Reglas:

- Rango: 3 o más posiciones consecutivas del **mismo disco**. Dos consecutivas quedan como
  dos pistas (un rango "2–3" no ahorra nada y se lee peor).
- Exclusión: si faltan 1 o 2 pistas respecto del total de la edición y el total es ≥ 5,
  `"except"` con las pistas faltantes. Con menos de 5 pistas la exclusión confunde más de lo
  que ahorra ("todas salvo la 4" en un EP de 4).
- `total` sale de `tracks` (edición representativa), la misma fuente que ya decide los
  títulos; si no hay pistas cargadas, no se usa exclusión.

`TrackRefs` renderiza los segmentos: cada extremo de rango y cada pista suelta es un
enlace, con el mismo `aria-label`/`title` actuales; el guion de rango es "–" (en dash). En
varios discos cada extremo usa la etiqueta actual `disco-posición` ("2-1–2-4"): se mantiene
la convención existente en vez de inventar un formato nuevo.

Textos nuevos: `allTracksExcept` ("todas salvo la {tracks}" / "all but {tracks}") y el
conector de dos exclusiones ("la 1 y la 7" / "1 and 7").

### D3. Traducciones: agregar claves y una prueba de paridad

Se agregan las claves del inventario a `catalog.album.credits.attributes` y `.roles` en
`es` y `en` (Moog y Hammond se dejan como nombre propio: "Moog", "órgano Hammond"). Una
prueba de Vitest compara los conjuntos de claves de `roles` y `attributes` entre `es` y
`en`. No se agrega una prueba contra la base (las pruebas unitarias no tocan Postgres); el
inventario se rehace a mano con la misma consulta cuando el catálogo crezca.

### D4. Niveles contraídos como una lista

`PeopleView` envuelve los niveles contraídos en un `<div>` con borde superior e inferior y
`divide-y`; cada `<details>` ocupa una fila con `<summary>` de alto cómodo (`py-2.5`), un
chevron de mayor contraste, `hover:bg-ink-surface`, nombre del nivel en `text-paper` y
resumen en `text-paper-muted`. El contenido desplegado va dentro del mismo `<details>`, con
sangría. Arte y otros pasa a usar `CollapsibleLevel` con su resumen de cantidad ("+9
créditos"), en vez de su `<summary>` propio. Todo sigue siendo CSS sobre `<details>`, sin
JavaScript.

## Risks / Trade-offs

- [El peso de un instrumento es opinable (¿teclados antes que guitarra?)] → Solo se separan
  4 escalones claros; dentro de "instrumentos" se conserva el orden de MusicBrainz.
- ["todas salvo" depende del total de la edición representativa] → Las pistas de la fila se
  calculan sobre esa misma edición, así que son coherentes; sin pistas cargadas se cae a la
  lista normal.
- [Traducciones nuevas quedan desactualizadas cuando el catálogo crece] → El fallback al
  texto de MusicBrainz sigue; el inventario se rehace con la consulta documentada.
