## Why

El Top N muestra lo que una persona elige; la gráfica de discografía muestra algo que nadie más puede armar: su recorrido por la carrera de un artista, disco por
disco (`docs/05-features/sharing.md` §4.1). Además falta el destino público del progreso de discografía, que hoy solo existe en `/me/artist-journeys`. Esta es
la primera de tres fases.

## Goals

- Que una persona vea y comparta su lectura de la carrera de un artista, sin armar nada: la Lámina existe en cuanto hay datos.
- Abrir notas que hoy no son públicas solo con un gesto explícito, reversible y por artista.

## Non-Goals

- Vista **Por canción**, Lámina de álbum e interruptores de EP, en vivo y compilados (Fase 2).
- "Valora lo que falta" y "Arma la tuya" en esta página (Fase 3).
- "Compárala con la tuya": pasa a "Tú vs. otra persona", su propio cambio.
- Entrada en el feed al hacer pública una discografía, y el ofrecimiento al completar un Recorrido.

## What Changes

- **Página** `/users/<u>/artist/<id>`: la discografía de una persona con un artista, con los discos que valoró en orden cronológico, su nota y la curva de la carrera. Desde 3 discos valorados.
- **Quién la ve:** el dueño y sus seguidores, como cualquier valoración. Un anónimo, solo si el dueño la hizo pública y puede ver su perfil.
- **Marca por artista:** "Hacer pública y compartir" guarda una marca reversible por persona y artista, en la tabla nueva `discography_share` (migración `0084`). Se mantiene al día: las notas nuevas de ese artista también se ven.
- **Progreso en la cabecera:** con un Recorrido activo, la barra discreta de siempre, sin números (§6.4.1 de la filosofía de producto). Sin Recorrido, "7 discos valorados", sin total.
- **Imagen** en Enlace, Publicación e Historia: curva y grilla de hasta 20 discos con su nota, "+n" si hay más. Hasta 10 carátulas, las de los mejor valorados; los demás, recuadro tipográfico.
- **Imagen privada del dueño** antes del gesto, como en una valoración.
- **Entradas:** sección en `/me/laminas` y enlace en la página del artista para quien tiene 3 discos valorados.
- **ADR nuevo:** una Lámina derivada también puede juntar hasta 10 carátulas.

## Capabilities

### New Capabilities

- `discography-laminas`: página, visibilidad, marca por artista, progreso y entradas.

### Modified Capabilities

- `share-images`: imagen de una discografía y tope de carátulas.
- `share-events`: tipo `discography`.
- `personal-share-image`: una discografía tiene imagen privada, gesto y marca reversible.
- `cover-art-mirror`: excepción ampliada a la Lámina de discografía.

## Impact

- **Base de datos:** migración `0084` (`discography_share` y `CHECK` de `share_event`).
- **Servicios:** `src/services/laminas/discography.ts` (nuevo), objetivo de imagen, `share/own.ts`, `account-lifecycle.ts`.
- **Interfaz:** página pública, `DiscographyFrame`, `/me/laminas`, página del artista, hoja de lo propio.
- **Documentación:** ADR 0053, `docs/05-features/sharing.md`, `business-rules.md`, `domain-model.md`, `sql-model.md`, `contracts.md`, `data-licensing.md`, `AGENTS.md`.
