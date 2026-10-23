## Why

Tras las fases 1 y 2, `/me/want-to-listen` (Pendientes) ya no tiene errores y tiene cabecera, filtro y orden, pero cada
entrada sigue igual que al principio: una inicial en lugar de la foto del artista, ningún dato para decidir qué escuchar
(cuándo lo anotaste, año, tipo) y, como acciones, enlaces de texto subrayados ("Quitar" en dos pasos, "Completar
discografía"). Falta además la acción más natural de un pendiente: decir que ya lo escuchaste, que registrar la escucha
ya retira la entrada sola. La auditoría del 2026-10-22 propuso, como Fase 3, rehacer las vistas y las acciones.

## What Changes

- **"Ya lo escuché"** en cada entrada: registra la escucha en el Diario (nace privada, como toda escucha rápida) y, por
  la regla existente, la entrada sale de Pendientes. Un aviso ofrece **Deshacer** (borra la escucha y vuelve a anotar).
- **Menú `⋯`** por entrada con: Ya lo escuché, Completar discografía o Ver tu discografía (artistas), Añadir a una
  lista y Quitar de Pendientes. Reemplaza los enlaces de texto y la acción de discografía visible.
- **Quitar con Deshacer:** quitar es inmediato y el aviso ofrece Deshacer durante 6 s (reemplaza la confirmación en dos
  pasos). Deshacer vuelve a anotar la entrada (su fecha de anotación se reinicia).
- **Datos por entrada:** foto del artista (en círculo, con la inicial como respaldo); año y tipo del álbum; "anotado
  hace X" en Detallada e Índice.
- **Detallada** sin tarjetas: filas separadas por una línea, "Ya lo escuché" visible desde `sm` y `⋯`. Un artista con
  discografía en curso lleva la etiqueta "Discografía en curso".
- **Índice como tabla** (`<table>`): Título, Artista, Año, Anotado y acciones; bajo `sm` solo Título (con el artista
  debajo) y acciones.
- **Gráfico** con pie de foto (título y artista · año) y el `⋯` sobre la carátula; sin acciones de texto.
- **API:** las entradas de artista traen la foto en `coverThumbUrl`; las de álbum, `year` y `category`.

### Goals

- Que cada entrada diga qué es y desde cuándo está, y que el pendiente se cierre desde la propia página.
- Acciones con el mismo patrón que Favoritos (menú y deshacer).

### Non-Goals

- Nota de "quién me lo recomendó" (necesita columna nueva).
- Selección múltiple y acciones en lote.
- Totales, progreso o recordatorios.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `want-to-listen`: requisitos nuevos de contenido de cada entrada, "Ya lo escuché", menú de acciones, quitar con
  deshacer y vistas; se retiran los requisitos de la Fase 1 sobre acciones de texto, la acción de discografía visible y
  la confirmación en dos pasos.

## Impact

- API: `src/services/want-to-listen/want-to-listen.ts`, `src/lib/api/schemas.ts` (campos opcionales nuevos) y pruebas;
  `docs/04-api/contracts.md`.
- UI: `src/components/want-to-listen/` (renderers, menú, aviso, lista, sección) y pruebas; se borran
  `RemoveEntryButton`, `WantToListenArtistJourneyAction` y `ArtistPlate` pasa a respaldo de la foto.
- `messages/{es,en}/wantToListen.json`; `docs/05-features/listening-diary-and-ratings.md` §12.
- Efecto lateral: el riel "Para anotar" del Diario, que usa el mismo listado, pasa a mostrar la foto de los artistas.
- Sin esquema ni dependencias nuevas.
