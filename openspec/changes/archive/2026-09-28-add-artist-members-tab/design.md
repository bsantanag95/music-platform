## Context

La página de artista (`redesign-artist-page`) tiene cabecera con ficha (`ArtistFacts`),
pestañas como segmentos de ruta bajo `(tabs)/` (Discografía en la raíz, Biografía en
`biography/`), y debajo del contenido de la pestaña la lista `ArtistMemberships` (integrantes
de un grupo o grupos de una persona) antes de las notas de la comunidad. En la página de una
persona, la pestaña Discografía muestra además la franja "También en" (`AlsoIn`,
`artist-also-in.ts`) con una tarjeta por grupo. Los loaders de la página viven en
`artist-data.ts` con `React.cache`, así el layout y la pestaña comparten lecturas en la misma
request.

`add-artist-lineup-data` entrega `getArtistLineup(artistId)` (alineación clasificada, líneas de
instrumentos, marcas, año de muerte, otras afiliaciones, pendientes) y
`scheduleLineupMembersSync(artistId)`. Los instrumentos llegan crudos de MusicBrainz; el
diccionario `catalog.album.credits.attributes` ya los traduce para los créditos del álbum.

Decisiones de producto (exploración del 2026-09-28, wireframe aprobado): pestaña de primer
nivel con línea en la cabecera; sub-vistas Completa, Actual, Antiguos y Apoyo; "Músicos de
apoyo" como un solo grupo; "También en" colapsado a una línea con "+N"; período desconocido;
pestaña Bandas en la página de una persona.

## Goals / Non-Goals

**Goals:**

- Alineación legible al estilo de Metal-Archives, en español e inglés.
- Navegación entre bandas desde cada integrante, sin que una fila con muchas bandas domine la
  vista.
- Una sola fuente para los grupos de una persona (la pestaña Bandas), sin duplicados.

**Non-Goals:**

- Datos, sincronización y clasificación: `add-artist-lineup-data`.
- Fotos de los integrantes en las filas de un grupo (la lista es densa, como en Metal-Archives).
- Línea de tiempo gráfica de la alineación.
- Músicos de sesión derivados de los créditos de los álbumes.

## Decisions

### D1. Una pestaña con dos nombres, un segmento `members/`

`(tabs)/members/page.tsx`, entre Discografía y Biografía. En un grupo se llama
**Integrantes**; en una persona, **Bandas**. La pestaña se muestra si hay algo que listar (un
grupo con integrantes o apoyo; una persona con grupos, apoyo dado o músicos de apoyo propios);
si no, su URL responde 404, igual que Biografía sin resumen.

La alineación se lee con un loader `loadLineup(artistId)` en `artist-data.ts` (`React.cache`):
el layout lo usa para la barra de pestañas y la línea de la cabecera, y la pestaña para su
contenido, con una sola lectura por request.

### D2. Sub-vistas por `?view=`

`?view=all` (por defecto), `current`, `past`, `support`, como `?view=songs` en los créditos del
álbum. Un valor desconocido cae en `all`. Las sub-vistas se renderizan en el servidor; la barra
es de enlaces con `aria-current`. Una sub-vista sin personas se oculta; si solo queda una con
contenido, no hay barra. En un grupo terminado, Actual se llama **Última alineación**. La
página de una persona no tiene sub-vistas: muestra sus bloques seguidos.

Completa agrupa, en este orden: Actual (o Última alineación), Antiguos, Músicos de apoyo ·
actuales, Músicos de apoyo · anteriores. Apoyo muestra los dos bloques de apoyo.

### D3. Formato de la fila

Escritorio: dos columnas (nombre de ancho fijo, rol), y la línea "También en" debajo ocupando
el ancho. Móvil: todo apilado.

- **Nombre** enlazado a la página de la persona, con **★** si es fundador (texto accesible
  "fundador") y **(†AAAA)** si terminó con año (solo **†** sin año).
- **Rol**: una línea por grupo de instrumentos (D5 de `add-artist-lineup-data`). Instrumentos
  traducidos con `catalog.album.credits.attributes` (el crudo si no hay traducción), unidos
  con coma, con mayúscula inicial, y sus períodos entre paréntesis: `Batería (1981–1999,
  2004–2015, 2018–presente)`. "adicional" se agrega como `· adicional`. Un período sin
  instrumentos muestra solo los años.
- **Años** (`formatLineupPeriods`, puro, en `artist-format.ts`): `1981–1992`; abierto
  `2018–presente`; mismo año `2005`; sin inicio `?–1992`; terminado sin fin `1992–?`; sin
  fechas `período desconocido` (el período entero, no el paréntesis vacío).
- Leyenda al pie: "★ integrante fundador · † año de muerte", solo si alguna fila usa una marca.

### D4. "También en" colapsado a una línea

Componente cliente `LineupAlsoIn` (solo el estado de expandir):

- Contenido: las otras afiliaciones en el orden que entrega la lectura (actuales, antiguas con
  prefijo `ex-`, apoyo con sufijo `(apoyo)`), cada una enlazada.
- **Colapsado**: las 3 primeras en una línea que se corta con elipsis si no cabe
  (`truncate`), y fuera del corte un botón **+N** con las restantes (`aria-expanded`, nombre
  accesible "Ver N bandas más de {nombre}"). Con 3 o menos no hay botón.
- **Expandido**: todas, en varias líneas, y el botón pasa a "Ver menos". Solo se expande esa
  fila.
- Sin afiliaciones (o persona pendiente de sincronizar): la línea no aparece.

Así cada fila ocupa como máximo una línea extra, tenga 2 bandas o 15.

### D5. Aviso de sincronización y disparo

La pestaña llama a `scheduleLineupMembersSync(artistId)` al renderizar (grupo, o persona con
músicos de apoyo propios). Si la lectura informa pendientes, arriba de la lista va un aviso
discreto: "Estamos sumando las otras bandas de los integrantes; aparecerán en tu próxima
visita." Sin cantidades.

### D6. Línea en la ficha de la cabecera

`ArtistFacts` recibe una fila opcional, después de Origen/Nacimiento y Actividad y antes de
Enlaces:

- **Grupo**: "Integrantes" (o "Última alineación" si terminó) con hasta 5 nombres de ese
  bloque, en su orden, enlazados, y "Ver alineación →" a `members?view=current`. Sin personas
  en el bloque, la fila no aparece.
- **Persona**: "Bandas" con hasta 5 grupos (actuales primero, luego antiguos por año de salida
  más reciente), enlazados, y "Ver todas →" a `members`. Sin grupos, la fila no aparece.

### D7. Pestaña Bandas de una persona

Bloques, cada uno omitido si está vacío:

1. **Bandas**: una tarjeta por grupo con foto, nombre (★ si es fundadora), líneas de
   instrumentos con períodos y, debajo, los años de actividad del grupo y la cantidad de discos
   principales cuando su discografía está sincronizada (lo que hoy muestra `AlsoIn`). Actuales
   primero.
2. **Apoyo para**: filas con el artista apoyado, instrumentos y períodos.
3. **Músicos de apoyo** (solistas con banda de gira): filas como las de un grupo (D3), con
   "También en".

La franja "También en" de la discografía de la persona se elimina.

### D8. Retiros

Se eliminan `ArtistMemberships` (y la sección debajo de las pestañas), `AlsoIn`,
`artist-also-in.ts` y sus tests, y las claves de mensajes que queden sin uso (verificando que
ningún otro componente las use).

## Risks / Trade-offs

- **La alineación queda un clic más lejos que en Metal-Archives** → la línea de la cabecera
  muestra la alineación actual y enlaza a la pestaña.
- **Cortar "También en" con elipsis esconde una banda a medias en móvil** → el "+N" siempre
  queda visible y expandir muestra todas.
- **Instrumentos sin traducción** (el vocabulario de MusicBrainz es grande) → se muestra el
  término crudo; las faltantes se agregan al diccionario compartido con los créditos.
- **Primera visita sin "También en"** → aviso explícito; se completa en segundo plano.

## Migration Plan

Sin migración. Se implementa después de `add-artist-lineup-data` y de su backfill; sin datos de
períodos la pestaña igual funciona con lo que haya, porque la lectura nunca consulta
MusicBrainz.
