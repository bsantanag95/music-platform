## Context

La API `GET /api/catalog/release-group/[id]` ya ingiere una edición y arma el tracklist con créditos, pero esa lógica está dentro del route handler. La nueva página de álbum necesita la misma información durante el render inicial y la arquitectura del frontend establece que los Server Components deben llamar directamente a servicios de catálogo, no a la propia API por HTTP.

El álbum se identifica por el UUID propio de `release_group`. La edición seleccionada sigue siendo la primera edición oficial disponible, con fallback a la primera edición que entregue MusicBrainz. La respuesta pública actual ya contiene `release`, `cover` y `tracks`; el esquema cliente `TrackSchema` se sincronizará para incluir `recordingId`, ya presente en el contrato efectivo del endpoint. El contrato REST solo se actualizará si la implementación modifica el payload público.

## Goals / Non-Goals

**Goals:**

- Centralizar la lectura completa del álbum en un read-model reutilizable.
- Mantener el endpoint REST y el Server Component sobre la misma lógica de ingesta, consultas, créditos y ordenamiento.
- Garantizar orden determinista por disco y posición.
- Renderizar el tracklist agrupado visualmente por disco, con duración y créditos visibles.
- Mantener todos los textos de interfaz localizados.

**Non-Goals:**

- Cambiar el shape público del endpoint si el mapper REST actual puede conservarlo.
- Añadir enlaces de créditos; se implementarán en la Etapa 3.4.
- Añadir selección de ediciones alternativas.
- Implementar `error.tsx`, breadcrumbs, navegación global o página de canción.

## Decisions

### Read-model interno compartido

Se creará un servicio en `src/services/catalog/album-detail.ts` que resolverá el `release_group`, ejecutará o reutilizará `findOrIngestTracklist`, consultará tracks y créditos y devolverá un resultado tipado con `releaseGroup`, `release`, `cover` y `tracks`.

El resultado distinguirá al menos tres estados: álbum inexistente, álbum conocido sin ediciones ingeribles y detalle completo. Esto permite que tanto la página como el endpoint conserven la diferencia entre `ALBUM_NOT_FOUND` y `NO_EDITIONS_FOUND` sin interpretar un `null` ambiguo.

Se elige este read-model sobre hacer que el Server Component consuma el endpoint REST porque evita un round-trip HTTP al mismo proceso y mantiene la separación entre la capa pública REST y la carga inicial del servidor. El route handler reutilizará el servicio y mapeará el resultado completo al payload REST existente.

### Orden de tracks en la consulta

La consulta usará `ORDER BY track.disc_number ASC, track.position ASC` y un tercer criterio estable si la implementación lo necesita. El agrupamiento visual se hará en `TrackList` recorriendo los tracks ya ordenados y creando una sección por `discNumber`.

Se elige garantizar el orden en SQL en vez de ordenar únicamente en React porque el contrato del endpoint también declara el orden y ambos consumidores deben recibir la misma secuencia.

### Shape del track y créditos

El read-model conservará `recordingId`, `discNumber`, `position`, `title`, `durationSec` y los créditos con `artistId`, `name`, `role` y `joinPhrase`. `TrackSchema` se actualizará para incluir `recordingId`, que ya existe en la respuesta efectiva del endpoint y en su contrato documentado.

`TrackList` mostrará los créditos como texto utilizando name, role y joinPhrase. No generará enlaces a artistas ni expondrá una navegación nueva; esa responsabilidad queda para la Etapa 3.4. Las duraciones válidas se formatearán como mm:ss y las duraciones nulas usarán una etiqueta localizada.

### Separación de mappers

El Server Component mapeará el read-model interno a props de presentación sin pasar tipos Drizzle directamente a componentes cliente. El endpoint conservará su shape actual (`release`, `cover`, `tracks`) mediante un mapper explícito, omitiendo `releaseGroup` del resultado público mientras no sea necesario.

Se elige un mapper explícito sobre serializar el read-model completo porque evita ampliar accidentalmente el contrato REST y mantiene el read-model como detalle interno de implementación.

### Carga de la carátula

`AlbumCover` consumirá solo la URL `cover` devuelta por el read-model o el endpoint. Usará `next/image` y un placeholder cuando no haya carátula. No construirá URLs de Cover Art Archive ni solicitará una resolución distinta de la miniatura de 250px.

### Manejo de errores de página

La página convertirá el estado de álbum inexistente en `notFound()`. El estado sin ediciones renderizará `EmptyState` con los mensajes de `NO_EDITIONS_FOUND`. Los errores inesperados seguirán propagándose según el comportamiento actual de Next.js; el boundary localizado `error.tsx` permanece explícitamente reservado para la Etapa 3.6.

## Risks / Trade-offs

- [La página y el endpoint pueden divergir si uno agrega un mapper propio] → El read-model será la única fuente de consultas y los mappers quedarán limitados a adaptar datos para cada frontera.
- [Una edición puede tener varios discos o posiciones no consecutivas] → El orden SQL y el agrupamiento por `discNumber` preservan la estructura recibida sin asumir una lista plana de un solo disco.
- [Algunos tracks no tienen duración o créditos destacados] → Se mostrarán valores localizados y neutros, sin bloquear el resto del tracklist.
- [La ingesta inicial puede tardar por el rate limit de MusicBrainz] → La carga inicial permanecerá en el Server Component y la etapa de pulido posterior incorporará los skeletons y estados globales previstos.
- [El endpoint podría requerir datos del release group en el futuro] → El read-model ya los conservará internamente; solo se actualizará el contrato cuando exista una necesidad pública concreta.

## Migration Plan

No hay migración de base de datos ni nuevas dependencias. Se extraerá la lectura compartida, se hará que el route handler la reutilice, se agregará la página, los componentes asociados y se actualizará `TrackSchema` para incluir `recordingId`. Se validará con `typecheck`, `lint`, `test`, `build` y el smoke test de catálogo cuando la modificación de servicios lo requiera.

El rollback consiste en retirar la página, los componentes y el servicio compartido, restaurando el route handler anterior; no se modifican datos persistidos ni migraciones.

## Open Questions

No quedan decisiones abiertas para la implementación de esta etapa.
