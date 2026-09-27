## Context

`src/app/[locale]/(catalog)/artist/[id]/page.tsx` arma la página en una sola columna:
`ArtistHeader` (foto circular, tipo, nombre, `bio`), `AlbumGrid` por cuatro categorías, siete
botones sueltos (seguir, escuchado, favorito, pendiente, agregar a lista, ver en listas,
todas las listas), `ArtistJourneySection`, `ArtistMemberships` y `Comments` en modo notas.
Para una persona, `findOrIngestDiscography` combina su discografía con la de sus grupos.
`LazyCoverImage` pide `/cover` al montarse, esté visible o no.

La página de álbum ya resolvió el mismo problema (`album-page-layout`,
`album-personal-panel`, `album-community-stats`, `album-list-picker`): grupo de rutas
`(tabs)` con layout compartido, panel lateral, tarjetas de comunidad con umbral de 5,
pestañas enlazables.

Decisiones de producto (exploración del 2026-09-27): foto chica rectangular sin portada;
resumen en la cabecera y texto en Biografía; 3 géneros visibles con el resto contraído; sin
nombre legal y con lugar de nacimiento; panel heredado del álbum con Escuchas y Colección
calculadas desde los discos; seguidores con umbral; enlaces en orden fijo; recorrido como
fila; EP en Principal; sin bootlegs; grilla por defecto en Principal y tabla en el resto con
selector; integrantes en un cambio aparte.

## Goals / Non-Goals

**Goals:**

- Página de artista con la misma estructura y lenguaje visual que la de álbum.
- Discografía navegable para artistas de 10 o de 300 discos.
- Cumplir las atribuciones de licencia de foto y texto.

**Non-Goals:**

- Integrantes: se conserva `ArtistMemberships` tal como está.
- Cronología en la pestaña Biografía (entradas y salidas de integrantes, discos por año).
- Artistas relacionados o similares.
- Cambiar la preselección de los recorridos (sigue siendo la categoría `studio`).
- Migrar otras superficies al selector de listas con casillas.

## Decisions

**D1 — Rutas con grupo `(tabs)`, como el álbum.** `artist/[id]/(tabs)/layout.tsx` (cabecera,
pestañas, integrantes, notas), `(tabs)/page.tsx` (Discografía) y
`(tabs)/biography/page.tsx`, con `loading.tsx` y `error.tsx`. Cargadores con `React.cache`
en `artist-data.ts` compartidos entre layout, páginas y `generateMetadata`. La sección de la
discografía es `searchParams.section` de la página de Discografía, no un segmento: cambiar
de sección no re-renderiza la cabecera.

**D2 — Lectura de discografía propia.** `getArtistDiscography(artistId)` lee los
release-groups acreditados al artista (rol incluido), sin los marcados fuera de la
discografía, aplica `discographySection` y devuelve las secciones con su cantidad. No usa
`findOrIngestDiscography` para la página: así una persona no hereda los discos de sus grupos,
sin cambiar el comportamiento que los recorridos esperan de esa función.

**D3 — Marcas personales y comunidad por disco en dos consultas.** Una consulta agrupada con
la media y la cantidad de valoraciones por release-group de la discografía (para la columna
de comunidad y "Mejor valorado"), y otra con las escuchas y valoraciones propias del usuario
sobre esos release-groups. Nada por disco.

**D4 — Vista recordada por sección en `localStorage`.** Un hook análogo a
`use-followed-artist-view-mode.ts`, con lectura y escritura dentro de `try/catch` y la vista
por defecto como respaldo. El primer render del servidor usa la vista por defecto; el cliente
aplica la preferencia guardada.

**D5 — Carga de carátulas por visibilidad.** `LazyCoverImage` habilita su `useQuery` recién
cuando un `IntersectionObserver` (margen de 200 px) detecta la tarjeta o la fila. Beneficia a
toda superficie que la use. La grilla agrega discos de a 48 en el cliente ("Mostrar más")
sobre la lista completa que ya entregó el servidor.

**D6 — Agregados de comunidad del artista.** `getArtistCommunityStats(artistId)`: oyentes =
`count(distinct user_id)` de entradas de diario sobre el artista o sobre release-groups de
su discografía propia (crédito `primary`, sin marcados), de cuentas activas; seguidores =
`artist_follow` de cuentas activas; favoritos = favoritos de artista; listas =
`countPublicListsContainingItem`. Umbral y forma compacta con `thresholdCount` y los
componentes del álbum.

**D7 — Panel del artista reutilizando piezas del álbum.** Conmutadores de Favorito y
Pendiente, invitación anónima y estilos de fila del panel del álbum. `AlbumListPicker` se
generaliza a un objetivo `{ type, id }` (la carga de pertenencias ya es por objetivo). La
fila Escuchas usa una consulta que devuelve la cantidad de release-groups distintos
escuchados y la última escucha (disco o artista). La fila Recorrido reutiliza
`getArtistJourneyDetail` y el modal de inicio existente.

**D8 — "También en" sin ingesta.** Grupos desde `membership` (período desde las fechas de la
pertenencia) y cantidad de discos principales solo si el grupo tiene discografía completa;
la franja nunca llama a MusicBrainz.

**D9 — Cabecera con datos de `enrich-artist-profile`.** Actividad de un solista = año mínimo
de su discografía propia en Principal. Fechas con la precisión guardada (año, mes y año,
fecha completa) formateadas con `useFormatter`. País por código con `Intl.DisplayNames`
cuando el lugar viene de MusicBrainz.

## Risks / Trade-offs

- [La preferencia de vista se aplica después de hidratar: parpadeo de grilla a tabla] →
  aceptado; ocurre solo para quien cambió la vista por defecto.
- [Un artista con 2.000 discos entrega una lista grande al cliente] → la tabla y la grilla
  renderizan todas las filas de la sección activa, pero las carátulas se piden por
  visibilidad; si hace falta, paginar en el servidor más adelante.
- [Actividad de un solista desde su primer lanzamiento puede no coincidir con su carrera
  real] → es lo que el catálogo puede afirmar; se rotula "desde" el año del primer disco.
- [El conteo de oyentes depende de que los discos estén en la discografía propia] → las
  apariciones no suman oyentes, para no atribuir escuchas de un disco ajeno.

## Migration Plan

Sin migración de esquema propia (los datos vienen de los dos cambios de datos). Orden de
implementación: `fix-artist-discography-ingestion` → `enrich-artist-profile` → este cambio.
La discografía por secciones puede implementarse apenas termine el primero.

## Open Questions

- Cronología en la pestaña Biografía: queda para un cambio posterior, probablemente junto con
  integrantes.
- Artistas relacionados: MusicBrainz no ofrece similares; falta definir el criterio.
