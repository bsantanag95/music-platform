## Context

`/me/feed` (`FeedList` → `FeedActivityList`) hoy renderiza exactamente el mismo contenido
que `FeedPreview` de Inicio (misma fuente `listFeed`), sin filtros, con paginación manual
(`useState` + `handleLoadMore`). `listFeed` (`src/services/feed/feed.ts`) compone el feed
uniendo **cinco queries independientes** (una por fuente: `listenEntry`, `favorite`,
`userList`, `rating`, `comment`), cada una con sus propios `leftJoin` a `artist` /
`releaseGroup` / `recording` para resolver el título del objetivo, y las fusiona/ordena/
pagina **en memoria** — no hay una tabla de eventos ni un `UNION` SQL único.

`/me/diary` resolvió el mismo problema (panel completo vs. preview) hace un día
(`add-diary-filters`): filtros combinables aplicados en servidor, migración de paginación
manual a `useInfiniteQuery`, y un `FilterSelect` propio para los `<select>`. Esa
implementación es la referencia técnica directa de este diseño — el objetivo es reusar el
patrón, no inventar uno nuevo.

## Goals / Non-Goals

**Goals:**
- Filtrar por `kind`, `authorId` y `q`, combinables, aplicados en servidor.
- Reusar `FilterSelect` (extraído a compartido) y el patrón `useInfiniteQuery` de
  `DiaryActivityList` sin reinventar la mecánica de filtros/paginación.
- Que agregar `kind` mejore además el rendimiento: si se filtra a un solo tipo, `listFeed`
  SHALL saltar las otras cuatro queries en vez de traerlas y descartarlas.

**Non-Goals:**
- No se toca `FeedPreview` ni `RecentSelfActivity` de Inicio.
- No hay combobox con autocompletado para `authorId` — un `<select>` simple alcanza para
  v1.
- No hay sincronización de filtros con la URL.
- No se materializa una tabla de eventos ni se cambia la estrategia de paginación en
  memoria — los filtros se aplican **dentro** de cada query por fuente, no después de
  fusionar.

## Decisions

### 1. `kind` se resuelve salteando queries, no filtrando el resultado fusionado

Cuando `kind` está presente, `listFeed` SHALL ejecutar **solo** la query de la fuente
correspondiente (p. ej. `kind=rating` → solo la query de `rating`) y devolver directamente
su página, sin fusionar con las otras cuatro. Alternativa descartada: traer las cinco
fuentes igual y filtrar el array fusionado por `kind` antes de paginar — funciona, pero
multiplica el trabajo de DB para un resultado que se descarta al 100% en cuatro de cinco
fuentes. Saltar las queries es al mismo tiempo el filtro y una mejora de rendimiento.

### 2. `authorId` se valida contra `followedIds`, no se le pasa una `authorId` cruda a la query

`authorId` SHALL validarse como perteneciente a `followedIds` (el mismo array que ya
calcula `listFeed` a partir de `userFollow` con `status = 'accepted'`) antes de ejecutar
cualquier query; si no pertenece, `400 VALIDATION_ERROR` sin tocar la DB. Si es válido, se
usa `eq(x.userId, authorId)` en lugar de `inArray(x.userId, followedIds)` en cada fuente
consultada. Alternativa descartada: dejar que la query devuelva vacío si `authorId` no es
un seguido (sin validar) — se descarta porque un feed vacío por un `authorId` inválido es
indistinguible de un seguido real sin actividad, y el caso de error (autor mal formado,
o ya no seguido) merece `VALIDATION_ERROR` explícito, igual que `add-diary-filters` valida
sus enums.

### 3. `q` es `ilike` sobre las mismas columnas de título que cada fuente ya resuelve

Cada una de las cinco queries de `listFeed` ya hace `leftJoin` a `artist` / `releaseGroup`
/ `recording` para poblar `target.title`. `q` SHALL agregar una condición `or(ilike(...))`
sobre esas mismas columnas ya unidas (`artist.name`, `releaseGroup.title`,
`recording.title`), igual que hace `listMyDiary` en `add-diary-filters`. La fuente de
eventos de lista (`userList`) filtra por `ilike(userList.title, ...)` directamente, sin
join adicional. No se agrega ningún índice nuevo — mismo criterio que diario (volumen por
usuario es bajo; se revisita con datos reales).

### 4. `FilterSelect` se extrae a `src/components/ui/FilterSelect.tsx`

Hoy vive definido localmente dentro de `DiaryActivityList.tsx`. Con una segunda pantalla
usándolo, se extrae tal cual (misma API: `value`, `onChange`, `ariaLabel`,
`widthClassName`, `children`) a `src/components/ui/`, y `DiaryActivityList` pasa a
importarlo desde ahí. Alternativa descartada: duplicar el componente en `FeedList.tsx` —
va contra la convención de "sin duplicación cuando el sistema ya tiene el patrón".

### 5. `FeedList` migra a `useInfiniteQuery`, mismo `queryKey` con filtros

Mismo mecanismo que `DiaryActivityList`: `queryKey` incluye los filtros vigentes,
`initialData` siembra la página 1 sin filtros (ya resuelta en servidor por `page.tsx`),
`placeholderData: keepPreviousData` para no vaciar la lista al cambiar un filtro. El
`authorId` del `<select>` sale de una consulta liviana de "seguidos aceptados" (id +
username + displayName, sin paginar) — a definir en tasks si `listFollowing` ya alcanza o
hace falta una función dedicada.

### 6. El plegado de citas largas es una prop propia de `FeedActivityList`, no un valor fijo interno

`FeedActivityList` gana `clamp?: boolean` (default `false`) y la reenvía a `ProsePanel`.
Alternativa descartada (y corregida durante la implementación): activar el plegado
directo en el JSX interno de `FeedActivityList`, sin pasar por una prop. Se descarta
porque `ScrollablePreviewList.tsx` (el preview de feed y el rastro reciente de Inicio)
también renderiza `FeedActivityList` — sin la prop, Home heredaría el plegado por
accidente, violando el Non-Goal explícito de no tocar esos dos bloques. Con la prop,
`FeedList.tsx` (`/me/feed`) la activa y `ScrollablePreviewList.tsx` simplemente no la
pasa, quedando en su comportamiento default.

### 7. La detección de desborde mide la altura natural, no compara alturas de un elemento ya recortado

Primer intento (incorrecto): comparar `scrollHeight` contra `clientHeight` del párrafo
DESPUÉS de aplicarle `line-clamp-6`. Descartado tras verificación manual — Chromium
puede reportar ambos valores de forma inconsistente para un elemento con
`-webkit-line-clamp` (`display: -webkit-box`), dando falsos positivos incluso en
comentarios de una sola oración. Solución: medir `scrollHeight` del párrafo ANTES de
aplicar cualquier clase de recorte (en el primer render, `collapsed` depende de
`overflowing`, que arranca en `false`) contra `lineHeight × 6` calculado con
`getComputedStyle`; el recorte solo se activa una vez confirmado que hace falta.

### 8. El colapso corrige el scroll con `useLayoutEffect` + `scrollIntoView`, sin animación

Bug real reportado por el usuario tras probar 10.x: al colapsar una cita expandida con
"Ver menos", el contenido se encoge pero el scroll del viewport queda donde estaba,
dejando visible lo que quedó mucho más abajo (en el caso reportado, el footer del sitio).
Solución: `useLayoutEffect` que detecta la transición expandido→colapsado y llama
`containerRef.current.scrollIntoView({ block: "nearest" })`. Decisiones puntuales:
- **`useLayoutEffect`, no `useEffect`**: corre sincrónicamente después de que React
  actualiza el DOM pero ANTES de que el navegador pinte — la corrección nunca se ve como
  un segundo salto visible.
- **Sin `behavior: "smooth"`**: es una corrección de posición, no un gesto de scroll
  intencional del usuario — una animación acá competiría con la regla de "sin movimiento
  decorativo" de `DESIGN.md`.
- **`block: "nearest"`, no `"start"` ni `"center"`**: si la fila colapsada ya es visible
  tras encogerse, no la reposiciona innecesariamente; solo actúa cuando hace falta.
- jsdom no implementa `scrollIntoView` — se agregó un stub no-op global en
  `src/test/setup.ts`, mismo criterio ya usado ahí para `IntersectionObserver`.

### 9. Avatar de iniciales como fallback permanente, no como maqueta

No existe foto de perfil real en el producto (`app_user` no tiene columna de avatar).
Alternativa descartada: mockear una foto de perfil con datos planos para evaluar la
dirección visual antes de invertir en el feature real. Se descarta porque un círculo de
iniciales (mismo patrón que GitHub/Slack/Discord) resuelve el problema real — "sin foto
no hay sensación de distinción de quién hizo la actividad" — sin ningún trabajo de
backend (upload, storage, moderación, fallback para quien no suba foto), y si algún día
se construye la foto de perfil real, este círculo sigue siendo exactamente ese fallback.
No es trabajo descartable.

Color por hash determinístico del `id` del autor sobre 4 variantes de tokens ya
existentes (`petrol`, `petrol-hover`, `ink-border`, `paper-muted`), nunca ámbar. Riesgo
conocido documentado abajo: con pocos seguidos, dos autores pueden caer en la misma
variante (1 en 4) — siguen siendo distinguibles por la inicial; expandir a más
variantes (p. ej. sub-variantes por opacidad de los mismos 4 tokens) es la mitigación
natural si se vuelve un problema real, sin salir del set de tokens ya aprobado.

## Risks / Trade-offs

- **[Riesgo] `authorId` con muchos seguidos (100+)** → el `<select>` simple se vuelve
  incómodo de navegar. Mitigación: aceptado como límite conocido de v1 (decisión de
  producto, no de este diseño); un combobox con búsqueda es el camino natural si se
  vuelve un problema real.
- **[Riesgo] `ilike` sin índice a medida que crece el volumen por usuario** → mismo riesgo
  ya aceptado por `add-diary-filters` sobre el mismo patrón; se revisita con datos reales,
  no antes.
- **[Trade-off] Saltar queries por `kind` significa que la lógica de "qué fuentes
  consultar" ahora depende de un parámetro de entrada** → agrega una rama condicional a
  `listFeed`, pero evita el trabajo de DB descartado; se documenta con un comentario en el
  código, mismo criterio que el resto del archivo.
- **[Riesgo, sin resolver a propósito] Colisión de color de avatar con pocos seguidos**
  → con 4 variantes y una lista corta de seguidos (el caso más común), dos autores
  pueden caer en la misma variante (1 en 4 de probabilidad; observado en vivo con solo 2
  seguidos). Siguen siendo distinguibles por la inicial. Mitigación disponible si hace
  falta: expandir a 8 sub-variantes por opacidad de los mismos 4 tokens (ver decisión 9)
  — pendiente de que el usuario decida si vale la pena.

## Migration Plan

- Sin migración de datos ni de esquema. `GET /api/me/feed` es aditivo (los tres query
  params son opcionales): clientes existentes sin params no cambian de comportamiento.
- Deploy en un solo paso: servicio, ruta, y UI se despliegan juntos (no hay corte de
  compatibilidad entre versiones de cliente/servidor a coordinar).
- Rollback: revertir el commit/deploy; no hay estado persistido que limpiar.

## Open Questions

- ¿`listFollowing` alcanza para poblar el `<select>` de `authorId` (id + username +
  displayName, sin paginar), o conviene una función dedicada en `services/feed/feed.ts`?
  Se resuelve en tasks, no cambia el contrato de la API pública ni el spec.
