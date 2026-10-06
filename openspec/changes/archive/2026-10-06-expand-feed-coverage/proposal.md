## Why

El feed de actividad de seguidos es anterior a varias funciones de biblioteca (Caminos, colección
física, "En tu búsqueda", puntaje detallado 1–100) y no las refleja: filtra `user_list.kind =
'standard'`, deja la colección física en una franja ambiente al pie, oculta el /100 (D7 de
`define-detailed-score`) y muestra una valoración, su reseña y un comentario de la misma persona
sobre el mismo disco como tres filas seguidas. El 2026-10-06 se decidió ampliar la cobertura para
que el feed cuente lo que la red realmente hace con la música.

## What Changes

- **Puntaje detallado en el feed.** La fila de una valoración muestra `86/100` en lugar de `4,5`
  cuando el autor lo puso (y su etiqueta accesible lo incluye); la corrida plegada lo muestra como
  `★ 86/100`. Revierte D7 de `define-detailed-score` **solo para el feed** (también el rastro
  propio de Inicio, que comparte la presentación); las reseñas del perfil no cambian.
- **Caminos en el feed.** Dos entradas nuevas: crear un Camino (`kind = 'custom_journey'`) y
  completarlo (derivado en lectura, sin tabla de eventos: el momento en que el último álbum quedó
  escuchado). Respetan audiencia (`followers`/`public`), moderación, archivado y bloqueos.
  Trackear un Camino ajeno **no** entra (sigue siendo privado: el dueño no se entera). Los
  Recorridos de artista **no** entran: nacen siempre `private` y no tienen lectura ajena.
- **Colección física y "En tu búsqueda" en el feed.** Entradas al agregar un disco a la colección
  o a la wishlist, filtradas por `audience IN ('followers','public')`. La franja ambiente
  (`feed-ambient-events`), cuya única fuente era la colección, se **retira**.
- **BREAKING (privacidad de la wishlist):** `wanted_entry` gana una columna `audience`
  (migración nueva). Las entradas existentes quedan `private` (nada se expone); las nuevas nacen
  con la audiencia por defecto del usuario o, sin preferencia, `followers` (como en la colección, el alta no
  pregunta). La audiencia se ve en cada entrada y se edita en la pestaña "Busco" de
  `/me/collection`. "Aplicar a lo
  existente" sigue sin tocar la wishlist.
- **Fusión de valoración + reseña + comentario.** Entradas consecutivas de la misma persona sobre
  el mismo objetivo (a lo sumo una de cada tipo) se presentan en una sola fila: estrellas/puntaje,
  reseña y comentario juntos.
- Filtro por tipo y búsqueda por título para los tipos nuevos (`collection`, `wanted`, `camino`),
  glifos, traducciones, `/me/feed` y el rastro propio de Inicio.
- Corrección menor: el feed deja de mostrar listas ocultas por moderación.

## Goals

- Que el feed refleje Caminos, colección, wishlist y el /100 con las mismas reglas de visibilidad
  (audiencia, perfil, bloqueo, cuenta activa) que el resto de las fuentes.
- Menos filas redundantes: una sola fila por "opinión" sobre un disco.
- Ningún dato hoy privado pasa a ser visible sin una acción del usuario.

## Non-Goals

- Votos de género en el feed (descartado: ruido).
- Trackear Caminos ajenos o Recorridos de artista en el feed.
- Una tabla de eventos materializada: todo se sigue componiendo bajo demanda.
- Mostrar el /100 en las reseñas del perfil u otras superficies.
- Lectura de la wishlist ajena fuera del feed (perfil, por `username`).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `activity-feed`: nuevas fuentes (Camino creado/completado, colección, wishlist), nuevos
  `kind` filtrables, puntaje detallado visible, fila fusionada de opinión, tier de colección
  activado en el feed principal.
- `rating-display`: el feed pasa a mostrar el puntaje detallado (fila y forma compacta de la
  corrida plegada).
- `feed-ambient-events`: se retira la franja (su única fuente pasa a la línea de tiempo).
- `collection-wishlist`: audiencia por entrada; el feed como exposición adicional.
- `physical-collection`: la entrada de colección aparece en el feed según su audiencia.
- `default-audience`: la preferencia alcanza también a la wishlist (no así "Aplicar a lo
  existente").
- `camino`: crear y completar un Camino generan entradas de feed propias.

## Impact

- **BD:** migración `0061_wanted_entry_audience.sql` + `src/db/schema.ts` +
  `docs/03-data/sql-model.md`.
- **Servicios:** `src/services/feed/feed.ts` (fuentes nuevas), `src/services/home/home.ts`
  (rastro propio), `src/services/collection/wanted.ts`, `src/services/social/default-audience.ts`;
  se elimina `src/services/feed/ambient.ts`.
- **UI:** `FeedActivityList`, `feed-grouping`, `feed-entry-tier`, `FeedKindIcons`, `FeedList`
  (filtro de tipo), `/me/feed` (sin franja), formularios de la wishlist.
- **API:** `GET /api/me/feed` (nuevos `kind`, nuevas formas de entrada),
  `POST/PATCH/GET /api/me/collection/wanted` (`audience`); `docs/04-api/contracts.md`.
- **Docs:** `docs/05-features/activity-feed.md`, `physical-collection.md`, `caminos.md`,
  `docs/01-domain/business-rules.md` si aplica.
