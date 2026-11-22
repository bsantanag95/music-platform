## Why

Una lista no declara para qué existe: el propósito ("mis recomendaciones de doom", "por dónde empezar con Pink Floyd") vive
solo en el título, así que no se puede agrupar ni filtrar, y `/lists` termina ordenando por tipo de ítem (cuatro de cada cinco
listas son de álbumes). La exploración del 2026-11-22 (`mockups/lists-themes-2026-11/`) eligió redefinir `/lists` como un
buscador por tema y contenido (B), con las puertas por tema de A y la pestaña Listas por tema de las fichas (C), en tres fases.
Esta es la fase 1: el dato. Sin tema y "sobre qué" guardados, las fases 2 y 3 no tienen qué filtrar.

## What Changes

- Nuevo dato en `user_list` (migración `0098`): `theme`, de un vocabulario cerrado de 10 valores (9 temas + `other`) validado
  con `CHECK`, y un "sobre qué" opcional: `subject_artist_id` **o** `subject_genre_id` (a lo sumo uno, por `CHECK`). Las listas
  existentes quedan con `theme = NULL` ("Sin tema"); no se deduce nada del título.
- Crear una lista exige tema (API y formulario, también el panel rápido "Nueva lista"); el "sobre" es opcional. Editar una
  lista permite cambiar tema y "sobre". El `entityType` sigue fijo.
- Las listas que crea el sistema reciben tema en su alta: Camino y recorrido de artista → `start_here` (el recorrido, con su
  artista como "sobre"); Top N y tier list → `personal_ranking`. Las colecciones generadas y las editoriales quedan sin tema en
  esta fase (ver design).
- `/me/lists` avisa cuántas listas propias no tienen tema y permite asignarlo con un toque por lista.
- El tema se ve como chip en las filas del Lector de `/lists`, en la vista previa, en el encabezado del detalle y en las
  tarjetas de `/me/lists`; el "sobre" se ve como "sobre <nombre>" enlazado a su ficha.
- El toolbar de `/lists` suma un filtro por tema (`?theme=`), aplicado en el servidor junto a `q`, `type` y `sort`.
- Contratos: `POST /api/me/lists` acepta `theme` (obligatorio) y `subjectArtistId`/`subjectGenreId`; `PATCH` acepta los tres;
  las respuestas de lista exponen `theme` y `subject`; `GET /api/lists/discover` acepta `theme`.

## Goals

- Que toda lista nueva tenga tema y que el tema sea filtrable en `/lists` desde esta fase.
- Que el dato quede garantizado por la base (`CHECK`) y no solo por la interfaz.
- Que las listas existentes puedan clasificarse sin inventar valores.

## Non-Goals

- La página buscador (búsqueda en el contenido, resolución de entidad, "tratan sobre" vs "contienen", facetas calculadas de
  género y década, puertas por tema, rutas `/lists/temas/<slug>`): fase 2.
- La pestaña Listas de las fichas agrupada por tema y la nota por ítem: fase 3.
- Listas mixtas (decisión D1: siguen de un solo tipo).
- Etiquetas libres.
- Tema para las colecciones generadas y las listas editoriales.

## Capabilities

### New Capabilities
- `list-themes`: vocabulario de temas, "sobre qué" de una lista, temas asignados por el sistema a Caminos, recorridos y
  láminas, presentación del chip de tema y clasificación de listas sin tema.

### Modified Capabilities
- `lists`: crear una lista exige tema y acepta un "sobre"; editar permite cambiarlos.
- `community-lists`: el toolbar de `/lists` filtra por tema y las filas del Lector muestran el tema y el "sobre".

## Impact

- BD: `drizzle/0098_list_theme.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Servicios: `src/services/lists/{lists,discovery,community,types}.ts`, `src/services/camino/camino.ts`,
  `src/services/artist-journeys/artist-journeys.ts`, `src/services/laminas/{laminas,tiers}.ts`.
- API: `src/lib/api/schemas.ts`, `src/lib/api/list-filters.ts`, `src/app/api/me/lists/**`, `src/app/api/lists/discover`;
  `docs/04-api/contracts.md`.
- UI: `ListForm`, `ListMetaForm`, `NewListPanel`, `ListRow`, `ListPreview`, `ListDetailHeader`, `MyListsTab`,
  `CommunityListsToolbar`; mensajes `messages/{es,en}`; `src/i18n/client-messages.json`.
- Docs: `docs/05-features/lists-and-favorites.md`, `docs/01-domain/domain-model.md`, `docs/01-domain/business-rules.md`;
  Ayuda (`messages/{es,en}/info.json`) si describe cómo crear listas.
- Sin dependencias nuevas.
