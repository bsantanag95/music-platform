## Context

`DiscographyItemMenu` (`add-discography-quick-actions`) es un diálogo no modal con registrar
escucha, Favorito, Pendiente, listas, calificar e ir al álbum; recibe las marcas del disco ya
precargadas por la discografía (`getDiscographyMarks`, en lote) y avisa cada cambio a su dueño.

Las superficies nuevas:

| Superficie | Componente | Hoy |
|---|---|---|
| Búsqueda (`/search`, álbumes) | `AlbumResults` (`AlbumRow`, servidor) | enlace, sin acciones |
| Explorar | `AlbumCard` (cliente) en `AlbumRail` y `FilteredAlbumList` | menú "···" antiguo (`RowMenu`): agregar a lista, "Ver en listas", favorito, Pendiente, registrar escucha, "Lo busco", "Ya la tengo" — sin estado visible |
| Lista ajena | `ListItemsView` → `ItemsIndex` / `ItemsGraphic` / `ItemsDetailed` (sin `manage`) | enlace, sin acciones |
| Tira del álbum | `DiscographyStrip` | enlace, sin acciones |

El spec `collection-wishlist` exige "Lo quiero" en el menú de la ficha de álbum; `catalog-album`
tiene su propio menú por pista (no se toca).

## Goals / Non-Goals

**Goals:**

- Un solo menú de acciones por disco en todo el sitio.
- Sin consultas extra en la carga de cada página.
- Ordenar la tabla de la discografía por lo que importa al usuario.

**Non-Goals:**

- Marcas visibles (✓, ★, ♥) en las superficies nuevas: solo el menú.
- El menú por pista del álbum y los menús de gestión de listas propias.
- Canciones y artistas en búsqueda o listas (solo álbumes).
- Recordar el orden de la tabla entre visitas.

## Decisions

### D1. Un componente, dos fuentes de marcas

`DiscographyItemMenu` se mueve a `src/components/catalog/AlbumQuickActions.tsx` (nombre neutro)
y acepta las marcas de dos formas:

- **Precargadas** (discografía): como hoy, `marks` + `onMarksChange`.
- **Bajo demanda** (resto): `authenticated` sin `marks`; al abrirse, el popover pide
  `GET /api/me/release-groups/{id}/marks` y guarda el resultado en su propio estado. Mientras
  carga, las acciones se muestran deshabilitadas con su forma final (sin saltos); un fallo de
  carga muestra el error con "Reintentar". Sin sesión no hay request: la invitación a iniciar
  sesión de siempre.

La comparación con la discografía: ahí las marcas ya están y se ven en la tarjeta; acá no hay
marcas visibles, así que pedirlas en la carga de la página sería trabajo que casi nadie usa.

### D2. Endpoint de marcas de un disco

`GET /api/me/release-groups/{id}/marks` → `{ listened, stars, detailedScore, favorite, pending,
lists }` (la forma de `DiscMarks`), con `withErrorHandling`. Sin sesión, `401 AUTH_REQUIRED`;
id inválido, `400`; disco inexistente, `404 NOT_FOUND`. Reutiliza las consultas de
`getDiscographyMarks` con un solo id (una por tabla). `Cache-Control: no-store`.

### D3. Secciones extra opcionales

El componente acepta `extraActions` para lo que una superficie ofrecía y el menú común no. Solo
Explorar lo usa, para no perder funciones al unificar:

- "Ver en listas" (abre `ListsContainingItemPanel` como hoy),
- "Lo busco" (agrega el deseado, como hoy) y "Ya la tengo" (lleva al flujo de colección del
  álbum, como hoy).

"Agregar a lista" del menú antiguo lo cubre el selector de listas del menú nuevo; favorito,
Pendiente y registrar escucha, las acciones comunes (ahora con su estado).

### D4. Integración por superficie

- **Búsqueda**: `AlbumRow` es de servidor; el botón "…" va como isla de cliente al final de la
  fila, fuera del enlace. La página ya conoce la sesión y pasa `authenticated`.
- **Explorar**: el botón reemplaza al "···" en la esquina de la portada, mismo lugar y mismo
  comportamiento de visibilidad que en la discografía.
- **Lista ajena**: solo en listas de álbumes y solo sin `manage` (la vista del dueño ya tiene sus
  controles). Índice y detallada: al final de la fila; gráfica: esquina de la portada.
- **Tira del álbum**: esquina de la portada, salvo el disco actual (ya estás en su página).

Un solo menú abierto a la vez por superficie (estado en el contenedor de cada lista, como en la
discografía).

### D5. Orden de la tabla de la discografía

Encabezados Año, Media y Tú como botones dentro de `<th aria-sort>`. El primer clic ordena en el
sentido natural de cada columna (Año ascendente; Media y Tú descendente) y el siguiente lo
invierte. Por defecto, Año ascendente (el orden actual). Los discos sin valor (sin año, "—", sin
nota) van siempre al final, en cualquier sentido, con el título como desempate. El orden es
estado local de la sección: cambiar de sección vuelve al orden por año. En móvil, donde la
columna Media está oculta, se ordena por Año y Tú.

## Risks / Trade-offs

- **Latencia al abrir el menú fuera de la discografía** → una consulta chica por disco; el
  popover se abre al instante con las acciones deshabilitadas mientras llegan las marcas.
- **Explorar cambia de menú** → se conservan todas sus acciones; cambia la forma (diálogo en vez
  de lista de opciones) por consistencia con el resto del sitio.
- **Muchos botones "…" en listas largas** → los popovers solo se montan al abrirse.
