## Context

`WantToListenList` (estado local, sin TanStack Query) pinta dos secciones con tres renderers. Cada renderer escribía
sus acciones de texto (`RemoveEntryButton` en dos pasos, `WantToListenArtistJourneyAction`). Favoritos resolvió lo
mismo en su Fase 3 con `FavoriteActions` (menú) y `FavoriteUndoToast`. El riel del Diario ya registra escuchas desde
un pendiente con `createListenEntry`, y el servicio del Diario retira la entrada de Pendientes al registrar.

## Goals / Non-Goals

**Goals:** cerrar un pendiente desde la página; acciones en un menú; deshacer; datos por entrada; tres vistas limpias.

**Non-Goals:** nota de recomendación, selección múltiple, esquema nuevo.

## Decisions

**D1. Datos en la API, aditivos.** `target.coverThumbUrl` de un artista pasa a ser su foto (`artist.photo_url`, la
misma que usa el Diario; antes siempre `null`). Las entradas de álbum suman `year` (`first_release_year`) y `category`
(`studio` | `single_ep` | `compilation` | `live_other`); en artistas son `null`. En el esquema Zod son opcionales.
Alternativa descartada: un campo `photoUrl` aparte (el Diario ya usa `coverThumbUrl` para la foto del artista).

**D2. "Ya lo escuché" = `createListenEntry`.** Igual que el riel del Diario: la escucha nace con los valores por
defecto de una escucha rápida y el servicio retira el pendiente. La lista quita la entrada, descuenta `counts` y
muestra el aviso "{título} quedó en tu Diario" con Deshacer. Deshacer borra la escucha (`deleteListenEntry`) y vuelve a
anotar (`toggleWantToListen`, crea la entrada con fecha nueva) y recarga la primera página con los filtros actuales.
Alternativa descartada: abrir el diálogo de registro con reacción y contexto (más fricción; principio "presencia ≠
criterio"). Ampliar la escucha queda en el Diario.

**D3. Quitar inmediato con Deshacer.** Sin confirmación: quita, descuenta y muestra "Quitaste {título}" con Deshacer
(6 s, `role="status"`). Deshacer = `toggleWantToListen` + recarga de la página 1. Un solo aviso a la vez: una acción
nueva reemplaza al anterior (su deshacer se pierde, como en Favoritos). Mientras se deshace, el aviso no se repite.

**D4. Menú `EntryActions` calcado de `FavoriteActions`.** Botón `⋯` (`aria-haspopup="menu"`, 28 px; 44 px con
puntero grueso) y menú con `menuitem`: Ya lo escuché · Completar discografía / Ver tu discografía (solo artistas; con
el estado del lote aún sin llegar, la opción no aparece) · Añadir a una lista · Quitar de Pendientes (en rojo, tras un
separador). Escape, clic fuera, flechas y retorno del foco igual que Favoritos. "Añadir a una lista" abre
`AddToListPanel` bajo la entrada (como el Diario).

**D5. Detallada.** `divide-y` sin tarjetas; carátula 56 px (foto del artista en círculo; sin foto, `ArtistPlate`
redonda). Título; debajo "Artista · año · tipo" (álbum) o "Artista" (artista) y "anotado hace X" (`useNow` +
`format.relativeTime`, sin desajuste de hidratación). La etiqueta "Discografía en curso" para artistas con recorrido.
A la derecha, "Ya lo escuché" (botón secundario chico, visible desde `sm`) y `⋯`.

**D6. Índice como tabla.** Una `<table>` por sección con encabezados (`sr-only` bajo `sm`): Título, Artista y Año
(solo álbumes), Anotado, y acciones. Bajo `sm` las columnas Artista/Año/Anotado se ocultan y el artista va bajo el
título.

**D7. Gráfico.** Carátula cuadrada (la foto del artista en círculo dentro del cuadro); `⋯` en la esquina superior
derecha sobre fondo translúcido, siempre visible; pie con título y "artista · año" (álbum) o "Artista".

**D8. Aviso de error por entrada** se mantiene (quitar o registrar), con `role="alert"` bajo la entrada.

## Risks / Trade-offs

- [Deshacer reinicia la fecha de anotación] → Igual que Favoritos; la entrada vuelve arriba en Recientes. Aceptable.
- [Deshacer "Ya lo escuché" con la escucha ya ampliada en otra pestaña] → Borraría esa escucha; el aviso dura 6 s.
- [Foto de artista en `coverThumbUrl` también en el riel del Diario] → Es una mejora; el riel ya la pinta en círculo.

## Migration Plan

Sin migraciones. Campos aditivos. Revertir es revertir el commit.
