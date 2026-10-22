## Why

`/{locale}/me/diary` acumula varios pases de diseño (`redesign-diary-row`, `add-diary-date-navigation`,
`add-diary-relisten-action`) y la auditoría del 2026-10-21 (escritorio 1280px y móvil 375px, con una cuenta real de 20+
escuchas) confirma que la base funciona: filtros sobre todo el historial, edición en línea, menú de acciones y meses
colapsables. Lo que falla es la jerarquía de la fila, el móvil y errores concretos:

- **Zona horaria.** Los meses se agrupan con la hora del navegador (America/Santiago, UTC−3), el filtro Año/Mes usa
  rangos en UTC y la lista de meses disponibles usa la zona de Postgres. Una escucha del 30 de septiembre a las 22:00
  aparece bajo «septiembre», pero el filtro «Octubre» la incluye y «Septiembre» no.
- **Carátulas engañosas.** Solo 9 de 20 filas muestran imagen: los artistas y todas las canciones muestran el disco de
  vinilo vacío, aunque el artista tenga foto y la canción tenga la carátula de su álbum.
- **Tipo invisible.** «Slave to the Grind · Skid Row» puede ser el álbum o la canción; nada lo dice.
- **Jerarquía invertida.** El contexto («Primera escucha») va encima del título y se repite en casi todas las filas;
  «Privado» se escribe en cada fila; la reacción, lo más personal de la entrada, es un ícono gris de 18px junto a la
  audiencia.
- **Móvil.** La línea de metadato se parte en dos y los íconos de editar y «···» cambian de posición de una fila a otra;
  los cinco desplegables de filtro ocupan unos 230px antes de la primera entrada; editar y «···» miden 24px y el
  control de mes 20px.
- **Menú.** Las opciones se cortan en dos líneas («Registrar otra / escucha»), «Eliminar» no está separado del resto y
  «Marcar como pendiente» no dice si el disco ya está en Pendientes.
- **Filtrar sin señal.** Al cambiar un filtro la lista anterior sigue visible sin indicar que está cargando.
- **Sin punto de partida.** La página es un «Diario» centrado, sin descripción ni acción para anotar; el estado vacío
  tampoco ofrece una.
- **Formulario.** Repite el nombre del objetivo que ya está en la fila, mezcla un desplegable (contexto) con chips
  (reacción, audiencia), no tiene contador de caracteres y «Cerrar» no dice que descarta.

## What Changes

**Fase 1: fila, jerarquía y correcciones**

- Fechas del diario en la **zona horaria del usuario**: el cliente la guarda en una cookie `tz`, next-intl la usa como
  `timeZone` y `GET /api/me/diary` y `GET /api/me/diary/months` aceptan `tz` para que agrupación, filtro y meses
  disponibles coincidan.
- **Carátula por tipo**: foto del artista en círculo (o el disco en círculo), carátula del álbum para las canciones.
  Afecta también al diario del perfil, que comparte el dato.
- **Nueva anatomía de fila** en una grilla fija que nunca se parte: día y día de la semana; carátula; título dominante
  con la reacción a su lado en ámbar; debajo «Artista · Tipo · Contexto»; a la derecha la audiencia como ícono con nombre
  accesible y las acciones, de 44px en móvil y 32px en escritorio.
- **Menú** más ancho, sin cortes, con «Eliminar» separado; la opción de Pendientes refleja el estado
  («Marcar como pendiente» / «Quitar de Pendientes») con un `inWantToListen` nuevo en cada entrada del diario propio.
- **Cabecera** con título, «Tu registro de escuchas» y la acción «Anotar escucha» (abre el registro global); estado
  vacío con esa misma acción y estado sin resultados con «Limpiar filtros».
- **Carga al filtrar**: la lista se atenúa y queda `aria-busy` mientras llegan los resultados.

**Fase 2: filtros, navegación y formulario**

- **Barra de filtros compacta**: buscador más un botón «Filtros» con el número de filtros activos que abre un panel de
  chips (Reacción, Contexto, Audiencia, Tipo, Fecha); los filtros activos se ven como chips que se quitan con un toque.
  El filtro nuevo **Tipo** (artista, álbum, canción) llega a la API como `type`.
- Año y Mes se reemplazan por un único control **Fecha** (meses con escuchas agrupados por año, y «todo el año»).
- Los filtros viven en la URL (`replaceState`, sin entradas en el historial) y el servidor siembra la primera página
  filtrada.
- **Encabezado de mes fijo** al desplazarse, con el control de colapso de 44px.
- **Carga continua**: la página siguiente se pide sola al acercarse al final; el botón «Cargar más» queda como respaldo.
- **Formulario**: contexto en chips como reacción y audiencia, contador «120/500», «Cancelar» en vez de «Cerrar»,
  Ctrl/⌘+Enter para guardar y sin la etiqueta redundante del objetivo dentro del diario.

**Fase 3: riel de contexto**

- Desde 1024px, la página pasa a `[minmax(0,1fr)_280px]` con un riel `sticky`:
  - **Ir a**: años y meses con escuchas, sin conteos, como atajos que aplican el filtro Fecha.
  - **Para anotar**: hasta 4 de tus Pendientes con «Anotar» (crea la escucha, que la saca de Pendientes por la regla
    existente, y la abre para ampliarla) y «Ver Pendientes».
  - **Así lo ven otros**: enlace a la pestaña de diario de tu perfil.

## Capabilities

### New Capabilities

<!-- ninguna -->

### Modified Capabilities

- `listen-diary`: el diario propio suma el filtro por tipo, la zona horaria del usuario para año/mes y meses disponibles,
  la cabecera con acción, la barra de filtros compacta, los filtros en la URL, el estado de carga y la carga continua; la
  presentación de la fila y de las reacciones se reemplazan por la nueva anatomía; el formulario de ampliar y el menú de
  la fila cambian su presentación; la cronología suma el encabezado fijo; y aparece el riel de contexto.

## Goals

- Que cada escucha se lea primero por lo que es (qué y cómo te sentó) y después por sus metadatos.
- Que la fila tenga la misma forma en todas las entradas y en cualquier ancho.
- Que el mes de una escucha sea el mismo en el encabezado, en el filtro y en la lista de meses.
- Dar un punto de partida para anotar desde el propio diario.

## Non-Goals

- Métricas de volumen: sin rachas, totales ni conteos por mes, tampoco en el riel (regla «registro intencional»).
- Cambiar la fecha de una escucha (hoy es la fecha de registro; editarla tocaría el esquema).
- Rediseñar el diario del perfil (`DiaryReadList`) más allá de las carátulas por tipo que comparte con este cambio.
- Migraciones de esquema.

## Impact

- **Código**: `src/app/[locale]/me/diary/page.tsx`, `src/components/diary/{DiaryActivityList,ListenEntryForm,
  ReactionBadge,DiaryReadList}.tsx`, `src/components/feed/feed-row-parts.tsx` (`DiaryDateBlock`),
  `src/components/ui/RowMenu.tsx`, `src/i18n/request.ts`, `src/app/[locale]/layout.tsx`,
  `src/app/api/me/diary/{route,months/route}.ts`, `src/services/diary/diary.ts`, `src/lib/api/{diary,schemas}.ts`,
  `messages/{es,en}/diary.json`. Componentes nuevos: barra de filtros, riel y cookie de zona horaria.
- **API**: `GET /api/me/diary` suma `type` y `tz` opcionales; cada entrada suma `inWantToListen` y `coverThumbUrl` deja
  de ser siempre nulo para artistas y canciones. `GET /api/me/diary/months` suma `tz` opcional. Todo aditivo.
- **Esquema**: sin migraciones.
- **Docs**: `docs/04-api/contracts.md` (diario propio, que además no documentaba `year`/`month` ni el endpoint de
  meses), `docs/05-features/listening-diary-and-ratings.md`, `docs/02-architecture/i18n.md` (zona horaria) y
  `docs/01-domain/business-rules.md` (mes calendario en la zona del usuario).
