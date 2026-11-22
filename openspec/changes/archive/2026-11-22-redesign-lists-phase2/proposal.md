## Why

La Fase 1 (`redesign-lists-phase1`) dio a `/lists` el marco, la entrada y los filtros. Queda el problema central de la auditoría del
2026-11-21:

- **Las tarjetas no dicen qué hay dentro de una lista.** Solo muestran un mosaico y metadatos de 12 px, así que dos «Artistas que sigo de
  cerca» se ven iguales.
- **Hay que abrir cada lista** para saber si vale la pena.
- **«Crear cuenta» y «Para completar» quedan al margen.** Viven en una columna de 280 px con el texto cortado, y en el teléfono quedan al
  final de la página.

Se eligió la propuesta «B · Lector». Las decisiones fueron:

- la primera vista previa resuelta en el servidor y las demás al elegirlas;
- en el teléfono las filas abren la lista;
- «Para completar» como pestaña.

## What Changes

- **Lector:**
  - las secciones De la gente que sigues, Populares y Recientes, más «Para completar», pasan a ser **pestañas** de un solo lector;
  - cada lista es una **fila** con su mosaico, título, dueño, fecha, tipo con número de elementos y guardadas;
  - el conteo de guardadas se muestra ahora en todas las pestañas, no solo en Populares;
  - cada pestaña tiene «Ver más».
- **Vista previa** fija desde `lg`:
  - muestra la lista elegida con su descripción, sus primeros 8 elementos numerados y los botones de abrir y guardar;
  - la primera lista llega resuelta del servidor y las demás se piden a `GET /api/users/{username}/lists/{listId}` al elegirlas;
  - en el teléfono no hay vista previa: tocar una fila abre la lista.
- **Se retira el riel lateral:**
  - «Tus listas» pasa a una línea bajo la frase de entrada;
  - la invitación sin sesión pasa a una banda después del lector;
  - «Para completar» pasa a ser una pestaña, con hasta 8 listas.
- **Modo explorar** (con filtros): usa el mismo lector, con una sola lista de filas paginada, sin pestañas.
- **Destacadas** se mantiene como hoy; su exhibidor llega en la Fase 3.

### Goals

- Decidir si una lista vale la pena sin abrirla.
- Que dos listas parecidas se distingan.
- Nada importante en una columna lateral ni al fondo del teléfono.

### Non-Goals

- El exhibidor de Destacadas, la forma final de la banda y los estados vacío y sin resultados: **Fase 3**.
- Las páginas de una lista, `/caminos` y `/me/lists`.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `community-lists`:
  - la vitrina se compone de Destacadas, el lector con pestañas y la banda sin sesión;
  - las tarjetas pasan a ser filas, con guardadas en todas las pestañas;
  - entra la vista previa;
  - se retira el riel de contexto; «Tus listas» y la invitación cambian de lugar.
- `camino-discovery`: «Para completar» pasa de módulo del riel a pestaña del lector, con hasta 8 listas.

## Impact

- **Página:** `src/app/[locale]/lists/page.tsx`.
- **Componentes nuevos** en `src/components/lists/`: `ListsReader`, `ListRow` y `ListPreview`, de cliente (pestañas, selección y
  petición de la vista previa).
- **Componentes que cambian o se retiran:**
  - `CommunityListSection`, `CommunityExploreGrid` y `ListsContextRail` se retiran o se reducen;
  - `ListsContextRail` deja de usarse y su contenido pasa a `ListsYourLine` y `ListsSignUpBand`.
- **Servicios:** `src/services/lists/{community,discovery}.ts` pueblan `saveCount` en todas las consultas con `saveCountsFor`.
- **Contratos:** `docs/04-api/contracts.md` (`saveCount` en `/api/lists/{discover,popular,from-following}`).
- **Mensajes y textos de cliente:** `messages/{es,en}/lists.json` y `client-messages.json`.
- **Tests:** de las piezas nuevas, de la página y de los servicios.
- **Documentación:** `docs/05-features/lists-and-favorites.md`.
- **Sin cambios:** esquema y dependencias. Las páginas informativas no cambian, porque la Ayuda no describe la vitrina en detalle (se
  comprueba al implementar).
