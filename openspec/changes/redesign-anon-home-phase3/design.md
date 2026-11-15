## Context

Fase 3 de tres (plan en el `design.md` de `2026-11-15-redesign-anon-home-phase1`; mockups `mockups/home-2026-11/c-disqueria.html` y, para el
horario, `a-resena.html`). Estado actual de los tres bloques:

- `HomeReleases` delega en `ReleaseRail` (sin sesión) o `ReleaseSwitcher` (con sesión). `listHomeReleases()` devuelve `HomeRelease[]` con
  `section: "recent" | "upcoming"`, `releaseDate`, `title`, `artist`, `coverThumbUrl` (siempre con carátula en la selección anónima) y `badge`.
  La selección anónima tiene hasta 12 + 12 discos.
- `HowItWorks` (solo sin sesión) arma `feature{1..9}{Title,Body}` y delega en `FeatureCarousel` (cliente, flechas, entrada escalonada).
- `AnonCta` (solo sin sesión): caja con el título y un botón «Registrarse».

Decisiones vigentes: tipografías actuales; el Inicio con sesión no cambia; `rating-display` manda en cualquier nota mostrada.

## Goals / Non-Goals

**Goals:** funciones visibles sin interacción, lanzamientos densos sin flechas, cierre con peso.

**Non-Goals:** la selección del calendario, el riel con sesión, el pie global.

## Decisions

### `ReleaseTimetable`, solo sin sesión
`HomeReleases` gana `layout="timetable"`, que solo pasa `AnonymousHome`; sin él, todo sigue igual (riel o selector). `ReleaseTimetable`
(server) parte la lista por `section`, ordena «Recientes» por fecha descendente y «Próximos» ascendente, y pinta cada parte como una lista
de filas: fecha (`Intl.DateTimeFormat` día + mes abreviado, tabular), miniatura de 40 px (`CoverThumb`), título y artista, y estado
(«Publicado» neutro, «Próximo» ámbar suave), toda la fila enlazada a `albumHref`. Seis filas visibles; el resto dentro de un `<details>`
nativo («Ver N más»), sin JavaScript. Desde `lg`, dos columnas; con una sola parte con contenido, solo esa. Encabezado con
`HomeSectionHeading`. *Alternativa descartada:* reutilizar `ReleaseRail` a más ancho — mantiene las flechas sobre las carátulas que la
auditoría señaló.

### Bloque de funcionalidades en lugar del carrusel
`HowItWorks` deja de usar `FeatureCarousel` (se elimina: solo lo usaba él) y pinta el bloque él mismo (server): tres paneles
(`feature1`, `feature2`, `feature6`) con una demostración fija debajo de su texto y una lista de las otras seis (`feature3–5`, `7–9`) con
icono SVG propio, título y cuerpo. Las demostraciones son `aria-hidden` y reutilizan piezas reales:
- **Diario:** tres filas con carátulas del mosaico del hero (`heroWallTilePosition`) y los nombres de contexto de escucha de los mensajes
  del diario (primera escucha, repetición, redescubrimiento).
- **Doble puntaje:** `StarRatingValue` con `showScore` (4,5 estrellas, `92/100`), y una barra 1–100 decorativa.
- **Colección física:** una copia (The Velvet Underground & Nico, vinilo) con tres o cuatro atributos tomados del vocabulario cerrado real
  de `messages/*/collection.json`, para no inventar nombres.

Ningún nombre de usuario ni dato real. Sin movimiento.

### Cierre en panel
`AnonCta` pasa a panel (`rounded-xl`, borde, superficie) con el `wall.webp` de fondo atenuado y enmascarado hacia un lado, título actual
(`anonClosingTitle`), una línea nueva sin promesas que el producto no cumpla (sin rachas ni pendientes, que son anti-features
documentadas) y dos acciones: «Crear cuenta» → `/auth/register` y, si `isExploreEnabled()`, «Explorar el catálogo» → `/explore`.

## Risks / Trade-offs

- [El horario muestra menos carátula que el riel] → Miniatura en cada fila; el horario gana en lectura de fechas, que es lo que el bloque
  ofrece.
- [`<details>` con estilos por defecto] → Se estiliza el `summary` (sin marcador nativo, foco visible) y se comprueba con teclado.
- [Demostraciones que se lean como datos reales] → Sin usuarios, contenidas en paneles de «Qué puedes hacer» y con `aria-hidden`.

## Migration Plan

Sin datos ni API; revertir el commit restaura riel, carrusel y caja.

## Open Questions

- Alto del pie en móvil (1105 px en la auditoría): fuera de esta fase porque el pie es global; queda en «Pendiente» de `home.md`.
