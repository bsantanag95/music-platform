## Why

La Fase 1 (`refine-want-to-listen-page-phase1`) dejó `/me/want-to-listen` (Pendientes) sin errores, pero la página
sigue sin cabecera ni herramientas: un título suelto, ningún modo de anotar algo sin salir de ella, sin filtro por tipo
ni orden, y el conteo de cada sección se oculta mientras haya páginas por cargar porque solo se conoce lo cargado. La
auditoría del 2026-10-22 propuso, como Fase 2, la misma cabecera y barra que ya tienen Calificaciones y Favoritos.

## What Changes

- **Cabecera:** bajo el título, una línea que dice qué es la página ("Lo que anotaste para escuchar más adelante") y el
  botón **"Anotar algo"**, que abre el diálogo global de "+ Añadir" ya en la acción Pendiente. Lo que se anota desde ahí
  aparece en la lista sin recargar.
- **Segmentos de tipo** Todo / Artistas / Álbumes con la cantidad de cada uno, calculada por el servidor sobre toda la
  lista (sin el filtro de tipo). Elegir un tipo muestra solo esa sección; un tipo sin entradas se ve deshabilitado.
- **Orden:** Recientes (por defecto), Más antiguos y A–Z (título, sin distinguir mayúsculas), aplicado en el servidor
  sobre toda la lista, también al "Cargar más".
- **Conteos verdaderos:** el encabezado de cada sección vuelve a mostrar su cantidad siempre, ahora desde el servidor.
- **Filtros en la URL** (`?type=&sort=`, con `replaceState`): el servidor siembra la primera página filtrada; un valor
  inválido en la URL se ignora.
- **API:** `GET /api/me/want-to-listen` acepta `type` y `sort` y responde `counts` por tipo. Cambio aditivo: `counts`
  es un campo nuevo en la respuesta y los parámetros son opcionales.

### Goals

- Encontrar y ordenar lo anotado sin perder la lectura liviana de la página.
- Conteos honestos con cualquier tamaño de lista.

### Non-Goals

- "Ya lo escuché", menú `⋯`, deshacer, foto de artista, metadatos nuevos e Índice como tabla (Fase 3).
- Búsqueda de texto dentro de Pendientes: con listas cortas no compensa (se puede sumar si alguien pasa de ~50).
- Totales grandes, progreso o recordatorios: Pendientes es una intención liviana (filosofía de producto).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `want-to-listen`: el listado propio admite filtro de tipo y orden y devuelve conteos por tipo; las secciones muestran
  el conteo del servidor; requisitos nuevos de cabecera con "Anotar algo" y de barra con segmentos y orden.

## Impact

- API: `src/app/api/me/want-to-listen/route.ts`, `src/services/want-to-listen/want-to-listen.ts`,
  `src/lib/api/schemas.ts`, `src/lib/api/want-to-listen.ts` y sus pruebas; `docs/04-api/contracts.md`.
- UI: `src/app/[locale]/me/want-to-listen/page.tsx`, `src/components/want-to-listen/` (lista, sección, segmentos,
  botón "Anotar algo"), `QuickActionsDialog` (acción inicial opcional) y sus pruebas.
- `messages/{es,en}/wantToListen.json`; `docs/05-features/listening-diary-and-ratings.md` §12.
- Sin esquema ni dependencias nuevas. `/me/diary` sigue usando el listado (solo lee `items`).
