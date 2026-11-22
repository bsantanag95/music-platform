## Why

Tras el rediseño de `/lists` (fases 1–3), "Para completar" quedó como la última pestaña del lector. Ahí pierde protagonismo, aunque
es lo nuevo de la sección: no es otra forma de descubrir listas, sino una **acción**, escuchar una lista de principio a fin y llevar la
cuenta. Además, el modo filtrado no tiene pestañas, así que al elegir un tipo («Álbumes», «Artistas», «Canciones») la sección
desaparecía hasta limpiar los filtros.

## What Changes

- **Sección propia:** «Para completar» deja de ser una pestaña y pasa a ser una sección después de Destacadas y antes del lector.
- **Encabezado:** una frase explica qué es completar una lista, con «Ver todas» hacia `/caminos`.
- **Tarjetas con acción:** hasta 4 tarjetas, cada una con su tira de carátulas, título, dueño, «N personas la están completando» y un
  botón «Completarla».
- **Con filtros:** como estas listas son siempre de álbumes, la sección se ve con «Todas» y con «Álbumes». Con texto, muestra solo las que
  lo contienen en el título. Con «Artistas» o «Canciones» se omite.
- **Lector:** queda con De la gente que sigues, Populares y Recientes.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `community-lists`: la superficie, el lector y la vista previa dejan de incluir «Para completar», que pasa a la nueva «Sección Para
  completar».
- `camino-discovery`: «Para completar» en `/lists` es una sección con hasta 4 listas, no una pestaña.

## Impact

- **Página:** `src/app/[locale]/lists/page.tsx`.
- **Componentes:**
  - nuevo `ListsToComplete`;
  - `ListsReader`, `ListRow`, `ListPreview` y `reader-entries` pierden la variante de camino.
- **Mensajes:** `messages/{es,en}/lists.json`.
- **Tests y documentación:** los tests y `docs/05-features/lists-and-favorites.md`.
- **Sin cambios:** API, esquema y dependencias.
