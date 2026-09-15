## Context

La página de gestión (`ArtistJourneyManager.tsx`) hoy renderiza siempre expandida la grilla de
casilleros agrupada por categoría (`ArtistJourneyAlbumGroups`) — el control de *edición* — como si
fuera el contenido principal. No hay ninguna vista de *lectura* de la selección ya elegida (con
carátula, orden, enlaces), ni foto del artista, y el contenedor está alineado a la izquierda.

## Goals / Non-Goals

**Goals:**
- El editor de selección (grupos + casilleros) pasa a estar oculto por defecto, detrás de una
  acción explícita, conservando intacto el borrador local y "Guardar" ya existentes (D6 del
  design original de `add-artist-journey-management-page` — no se toca esa mecánica).
- Nueva vista principal: la selección actual, agrupada por categoría, con carátula, ordenable por
  fecha de lanzamiento o alfabéticamente, en modo lista o gráfico, con una acción de quitar
  directa por álbum.
- Enlaces desde el título de cada álbum a `/album/[id]` y desde el nombre del artista (encabezado)
  a `/artist/[id]`.
- Foto del artista en el encabezado de la página.
- Contenedor centrado en vez de alineado a la izquierda.

**Non-Goals:**
- No cambia el modelo de datos, los endpoints ni el modal de inicio (`ArtistJourneyStartModal`).
- No persiste entre visitas el orden ni el modo (lista/gráfico) de esta vista — a diferencia del
  listado `/me/artist-journeys`, que sí persiste su modo (Requirement ya existente "Listado propio
  de recorridos"); aquí es una subvista de una sola página de gestión, sin necesidad equivalente.
- No cambia archivar/desarchivar/borrar ni el borrado del recorrido completo.

## Decisions

**D1 — El editor sigue siendo `ArtistJourneyAlbumGroups` sin cambios, solo se oculta por
defecto.** Se agrega un booleano `editorOpen` en `ArtistJourneyManager`. Un botón "Agregar o
quitar álbumes" lo abre; dentro del editor, un botón "Ocultar" lo cierra. El estado del borrador
(`selected`, `dirty`) vive en `ArtistJourneyManager`, no en el editor — ocultar el bloque no
descarta nada, porque el árbol que se desmonta no tiene ese estado.
*Alternativa descartada*: reescribir el editor como un modal aparte — se descarta porque
duplicaría UI ya construida y compartida con `ArtistJourneyStartModal`; un bloque colapsable
dentro de la misma página es más simple y no afecta a ese modal.

**D2 — Excepción: si la selección está vacía, el editor arranca abierto.** Con `selectedCount ===
0` (p.ej. un artista sin álbumes de estudio al activar) no hay nada que mostrar en la vista
principal de solo lectura; forzar un clic para llegar al único contenido útil de la página sería
friccion sin beneficio. El umbral es el mismo `selectedCount` que ya expone `journey.progress`.

**D3 — Nuevo componente de solo lectura para la selección, separado del editor.** Su HTML (carátula,
layout lista/gráfico, enlaces) no tiene nada en común con la grilla de casilleros, así que se
modela como un componente nuevo (`ArtistJourneySelectionView`) en vez de forzar un modo adicional
sobre `ArtistJourneyAlbumGroups`. Reutiliza primitivas ya existentes: `CoverThumb` (carátula con
fallback) y el mismo patrón visual de `ItemsDetailed`/`ItemsGraphic` (listas) para las dos
variantes lista/gráfico.

**D4 — Orden y modo de esta vista son estado local sin persistencia (`useState`), no el hook
`useArtistJourneyViewMode`.** Ese hook persiste en `localStorage` bajo una clave para el switcher
Detallada/Índice/Gráfico de `/me/artist-journeys` (tres opciones). Esta subvista tiene un conjunto
de opciones distinto (Lista/Gráfico, dos opciones) y un scope distinto (por página de gestión, no
global); compartir la clave mezclaría dos preferencias no relacionadas. Se usa `useState` local con
default "Lista" y orden por defecto "fecha de lanzamiento" (mismo criterio ascendente que ya usa
`sortDiscographyByYear` en el servidor, para no presentar un orden distinto al que el usuario ya
vio).

**D5 — Quitar un álbum desde la vista principal reutiliza `toggleAlbum`, no un endpoint nuevo.**
El botón "Quitar" de cada álbum en la vista de selección llama exactamente a la misma función que
ya desmarca un casillero en el editor: modifica el borrador local (`selected`), activa "Guardar" y
no llama al servidor hasta que el propietario confirma — mismo comportamiento ya definido y
probado por el Requirement "Editar un borrador local y guardar en una sola operación", solo con un
punto de entrada adicional.

**D6 — Foto del artista viaja como prop nueva (`artistPhotoUrl`) desde el server component.**
`page.tsx` ya obtiene `artistRow` completo (incluye `photoUrl`) vía `getArtistById`; solo hace
falta pasar ese campo a `ArtistJourneyManager`, sin tocar el servicio `artist-journeys.ts`. Se
reutiliza el patrón de `ArtistHeader`/`DiscPlaceholder` (imagen circular con fallback), a un
tamaño más chico acorde a una página de gestión (no el perfil del artista).

**D7 — Contenedor centrado, ancho un poco mayor.** `max-w-2xl` es angosto para una grilla de
carátulas en modo gráfico; se amplía a `max-w-3xl` y el `<main>` pasa de `items-start` a
`items-center`.

## Risks / Trade-offs

- [Riesgo] Ocultar el editor por defecto reduce su visibilidad para quien sí quiere agregar
  álbumes nuevos de entrada → [Mitigación] el botón "Agregar o quitar álbumes" queda siempre
  visible y prominente en el encabezado de la vista principal, nunca detrás de un menú secundario.
- [Riesgo] Quitar un álbum desde la vista principal sin guardar podría leerse como una eliminación
  inmediata → [Mitigación] reutiliza la misma señal ya presente ("Guardar" habilitado / "Sin
  cambios pendientes") que ya comunica que nada se persiste hasta confirmar; el álbum desaparece de
  la vista de solo lectura de inmediato (refleja el borrador), consistente con cómo ya se comporta
  desmarcar un casillero.
