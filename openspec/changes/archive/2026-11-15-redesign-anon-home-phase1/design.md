## Context

La portada sin sesión (`AnonymousHome`) es un hero a sangre completa (`AnonHero` + `HeroCoverWall` con el mosaico `public/hero/wall.webp`)
seguido de ocho bloques en una columna de 768 px (`max-w-3xl`). La auditoría del 2026-11-14 comparó tres direcciones con mockups navegables en
`mockups/home-2026-11/` (A · Reseña, B · Catálogo, C · Disquería) y se eligió **C**, con dos préstamos de A (escala de títulos y lanzamientos
como horario). Decisiones de producto tomadas con el usuario el mismo día:

1. **Buscador en el hero + búsqueda del Header visible en pantallas angostas.** Revierte lo decidido en `redesign-frontend`
   (`docs/05-features/home.md`, «Exclusivo de visitante anónimo»): el buscador vuelve al hero, pero solo sin sesión y como el mismo
   componente que el del Header, no como un `SearchForm` aparte.
2. **Se mantienen las tipografías actuales** (Space Grotesk, Source Serif 4, IBM Plex Mono). Cambiarlas queda como análisis futuro (abajo).
3. **Variante solo para Inicio** de los rieles compartidos con `/explore` (`CollectionRail`, `AlbumRail`): `/explore` no cambia (Fase 2).
4. **Entrada de ejemplo fija**, sin usuario real, rotulada como ejemplo.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-anon-home-phase1` (este) | Header con búsqueda en pantallas angostas; hero en dos columnas con buscador, caja de carátulas y entrada de ejemplo; acciones directas sin modal; textos en tuteo; listas vacías fuera; enlace a Usuarios dentro de la comunidad. |
| 2 | `redesign-anon-home-phase2` | Cuerpo a ancho completo (contenedor ~1400 px, márgenes fluidos 16–48 px) y escala de títulos de sección de 32–40 px con bajada (préstamo de A). «Mejor valorados» como riel con puntaje y posición sobre la carátula; colecciones en mosaico (una grande, cuatro medianas, «Lo que viene» a lo ancho) y **riel horizontal en móvil** (no apiladas); comunidad en 2/3 + 1/3: tarjetas de actividad (la primera ancha con extracto), panel de comentarios populares y panel de listas, con «Conoce a quienes escuchan». Variantes nuevas solo para Inicio; `/explore` igual. |
| 3 | `redesign-anon-home-phase3` | Lanzamientos como horario de dos columnas (Recientes / Próximos, fecha · título · artista · estado, marca de «Hoy»), préstamo de A, en lugar del riel con flechas; «Qué puedes hacer» con tres demostraciones (diario, doble puntaje, colección física) más seis funciones en lista con iconos, en lugar del carrusel; cierre en panel con el mosaico de fondo y dos acciones. Revisar el alto del pie en móvil (hoy 1105 px) como mejora acotada si no exige rediseñar el pie global. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente, como en los rediseños anteriores.

## Goals / Non-Goals

**Goals:**
- Primer viewport que explique el producto, permita buscar y lleve al registro en un paso, en 1440, 1024, 820 y 390 px.
- La búsqueda del Header alcanzable en un toque en cualquier ancho y página.
- Sin peticiones nuevas de imágenes ni dependencias nuevas.

**Non-Goals:**
- Cuerpo de la portada y `/explore` (Fase 2); lanzamientos, funciones y cierre (Fase 3).
- Cambios de tipografía, de tokens de color o del Inicio con sesión (salvo el Header compartido).

## Decisions

### Búsqueda del hero = `HeaderSearch` con variante de tamaño
`HeaderSearch` ya implementa selector de tipo, sugerencias locales, navegación a `/search` y reinicio a Artistas (`header-search`). Se añade
una variante `size="hero"` (alto ~56–60 px, radio y tipografía mayores, botón «Buscar» visible) en lugar de un formulario nuevo, para que
ambas entradas no diverjan. *Alternativa descartada:* reintroducir `SearchForm` en el hero (era el origen de la duplicación que
`redesign-frontend` eliminó). Debajo, accesos de ejemplo («Prueba con …») a `/search?type=artist&q=<nombre>`, con nombres curados en
`src/lib/config/hero-covers.ts` junto a las carátulas, para que se mantengan en un solo lugar y no dependan de la base.

### Header en pantallas angostas: control propio y fila bajo la barra
Hoy, por debajo de `lg`, `HeaderSearch fluid` vive dentro del menú. Se añade un botón de búsqueda (icono SVG propio, 44 × 44 px,
`aria-expanded`/`aria-controls`) junto al botón del menú que despliega una fila con `HeaderSearch fluid` bajo la barra; menú y búsqueda son
mutuamente excluyentes. Escape, el mismo botón o la navegación la cierran y el foco vuelve al botón. *Alternativa descartada:* campo siempre
visible en la barra; a 390 px no cabe junto al logo, «Crear cuenta» y el menú sin reducir el campo a algo inútil.

### Caja de carátulas desde el mosaico existente
`HeroCrate` reemplaza a `HeroCoverWall` en el hero: cuatro carriles (las cuatro filas de `HERO_WALL`) recortados del mismo `wall.webp` con
`background-position`, en un plano con perspectiva y máscara radial, y un desplazamiento horizontal lento (80–110 s por vuelta) solo con
`motion-safe`; con `prefers-reduced-motion` queda estático. Es decorativo (`aria-hidden`). Un solo archivo de imagen, ya en caché larga, y
dentro del límite de 250 px por carátula de la política de licencia (`docs/03-data/data-licensing.md`). El archivo se precarga
(`<link rel="preload" as="image">`) para no perder la prioridad que hoy da `fetchPriority` al `<img>`. *Alternativa descartada:* un
`<img>` por carátula (32 peticiones y optimizador de imágenes).

### Entrada de ejemplo estática
`HeroSampleEntry` (server component) muestra un álbum del muro (Loveless, My Bloody Valentine, 1991), 4,5 estrellas, 92/100 y
«Redescubrimiento», con un rótulo visible «Ejemplo». Reutiliza la presentación de estrellas existente y la insignia de puntaje de la casa
(`ScoreBadge` u homóloga) en lugar de dibujarlas de nuevo; la carátula sale del mismo mosaico. Sin enlace a la página del álbum (es
ilustrativa) y sin nombre de usuario. Textos en `messages/{es,en}/home.json`.

### Acciones directas
«Crear cuenta» (`Button` primario, enlace a `/auth/register`) y «¿Ya tienes una? Inicia sesión» (`/auth/login`). Se elimina
`GetStartedModal` y sus mensajes (`getStarted*`), que solo usaba `AnonHero`.

### Listas vacías fuera, en SQL
`listPublicLists` añade `EXISTS (select 1 from user_list_item where list_id = user_list.id)` al `where`, antes del `limit`, para que las
listas vacías no ocupen lugar. Sin migración: es una condición de consulta.

### Textos
Tuteo uniforme en `home.json` (es): `heroLine*` reorganizados en titular + bajada, `anonSubtagline` sin «Acá» y con «construyes» corregido,
`feature1Title` «Registra». El inglés se ajusta a la nueva estructura. El enlace suelto «Usuarios» pasa a la cabecera del bloque de
comunidad como «Conoce a quienes escuchan» → `/users`.

## Risks / Trade-offs

- [El hero vuelve a tener buscador y podría leerse como «un buscador más»] → Comparte el primer viewport con la caja de carátulas y la
  entrada de ejemplo, que son las que cuentan el producto; el buscador es la acción, no el mensaje.
- [Movimiento continuo en el hero] → Lento, solo `motion-safe`, sin parpadeos; con movimiento reducido es estático.
- [Cambio del Header afecta a todas las páginas] → Tests de Header para ambos estados y verificación a 390/820/1024 px en una página de
  catálogo además de Inicio.
- [LCP: el mosaico deja de ser un `<img>`] → Precarga explícita del archivo; el titular pasa a ser el elemento grande y se pinta sin
  esperar la imagen.
- [La entrada de ejemplo podría tomarse por actividad real] → Rótulo «Ejemplo» visible y sin nombre de usuario.

## Migration Plan

Sin datos ni API. Se despliega como cualquier cambio de interfaz; revertir el commit restaura el hero y el Header anteriores.

## Open Questions

- **Tipografías (análisis futuro, pedido explícito del usuario).** La propuesta C usaba Bricolage Grotesque (titulares) y Geist / Geist
  Mono (interfaz y datos). Se mantiene la tríada actual en las tres fases. Queda por analizar, como cambio aparte con su ADR: legibilidad de
  Source Serif 4 en textos cortos de interfaz, el uso excesivo de IBM Plex Mono como «tipografía de dato», el coste de cambiar todas las
  páginas ya rediseñadas, el peso de carga y si `DESIGN.md` y `design-tokens-naming.md` deben cambiar. Se anota también en
  `docs/05-features/home.md` («Pendiente»).
