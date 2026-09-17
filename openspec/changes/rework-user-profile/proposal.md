## Why

El perfil hoy es una colección de secciones bien especificadas (destacados, himno, álbumes
favoritos, reseñas, en rotación, huella de gusto, exploración, afinidad) pero sin una
jerarquía deliberada: identidad curada y actividad reciente se presentan con el mismo peso
visual, la huella de gusto (estadística) ocupa un lugar protagónico entre destacados y
exploración, y el dueño ve una composición distinta a la que ve cualquier visitante. El
objetivo de este cambio es que visitar el perfil de otra persona permita entender rápido
quién es musicalmente y genere curiosidad por seguir explorando — sin que el perfil termine
pareciendo un dashboard de estadísticas.

## What Changes

- Los destacados existentes (`profile-showcase`, hasta 4, tipos mixtos) ganan un marcador
  opcional "me define" exclusivo por tipo — a lo sumo un artista y a lo sumo un álbum así
  marcados — que junto con el Himno ya existente forman la **Tarjeta de Identidad** del
  primer nivel del perfil. No se crea una colección de destacados nueva: se extiende la
  existente.
- Se reordena la composición del perfil (`social-profiles`) en 3 niveles de profundidad:
  Nivel 1 (identidad, segundos) — Placa reducida + Tarjeta de Identidad; Nivel 2
  (exploración curada, minutos) — álbumes favoritos, en rotación, reseñas, exploración de
  artistas, listas destacadas, todo como resumen; Nivel 3 (inmersión bajo demanda) — diario
  completo, valoraciones, listas, huella de gusto completa, recorridos de artista,
  colección. La huella de gusto deja su posición actual (entre destacados y exploración) y
  pasa a Nivel 3; en su lugar, Nivel 1-2 muestra 2-3 señales cualitativas derivadas de los
  mismos datos, sin gráficos.
- La vista del dueño deja de recomponerse en un layout de una sola columna: usa la misma
  composición de dos columnas que ve un visitante autorizado, con la edición como capa sobre
  esa misma composición. La previsualización "cómo te ven" ya existente se conserva para
  perfiles privados.
- `profile-affinity` amplía dónde se muestran sus coincidencias: además de su propio bloque,
  la sección "Exploración" (artistas seguidos) indica inline cuáles de esos artistas también
  sigue el visitante, reutilizando el cálculo ya existente (sin score nuevo).
- El default de audiencia de un favorito nuevo (`favorites`) cambia de `followers` a
  `public`. Los favoritos ya existentes conservan su audiencia (no retroactivo).
- Se agrega la posibilidad de **destacar** una entrada de diario propia (`listen-diary`,
  `diary-visibility`) para hacerla visible más allá de su audiencia normal — mismo patrón
  que ya existe para listas (`lists`, "Fijar listas propias"). **BREAKING**: introduce la
  primera vía por la que una entrada de diario puede ser vista por alguien fuera de la
  relación de seguimiento del dueño.
- Nueva capacidad **`rating-highlights`**: permite fijar hasta un máximo de valoraciones
  propias como destacadas, visibles públicamente. **BREAKING**: hoy ninguna valoración es
  visible para quien no es el dueño o un seguidor aprobado — `taste-fingerprint` establece
  esa regla explícitamente ("las valoraciones, que no tienen audiencia propia, SHALL ser
  visibles solo para el dueño y para seguidores en relación aceptada"). Esta capacidad
  introduce la primera excepción deliberada, limitada a las valoraciones que el propio
  usuario elige exponer.
- Se corrige que el Himno no muestra carátula real (`coverThumbUrl` queda `null` hoy en
  `profiles/showcase.ts`); pasa a resolverla igual que el resto del catálogo.

## Capabilities

### New Capabilities

- `rating-highlights`: fijar hasta un máximo configurable de valoraciones propias del
  catálogo (artista, álbum o canción) como destacadas, con audiencia pública independiente
  de la regla general de visibilidad de valoraciones.

### Modified Capabilities

- `profile-showcase`: los destacados ganan un marcador exclusivo "me define" por tipo
  (artista, álbum), que junto con el Himno compone la Tarjeta de Identidad; se corrige la
  carátula ausente del Himno.
- `social-profiles`: se reordena la composición del perfil en 3 niveles de profundidad; se
  unifica el layout de la vista del dueño con el de la vista autorizada.
- `profile-affinity`: las coincidencias se distribuyen también como indicadores inline en la
  sección "Exploración", no solo en su propio bloque.
- `favorites`: el default de audiencia de un favorito nuevo pasa de `followers` a `public`.
- `listen-diary`: se agrega la posibilidad de destacar una entrada propia para hacerla
  pública.
- `diary-visibility`: la matriz de visibilidad gana una excepción para entradas destacadas.
- `taste-fingerprint`: se degrada de posición (pasa a Nivel 3) y se agrega un resumen
  cualitativo sin gráficos para los niveles 1 y 2.

## Impact

- **Esquema**: marcador "me define" en la tabla de destacados existente, con restricción de
  unicidad parcial por tipo y por usuario; marcador de "destacada" en `listen_entry` (o
  tabla asociada); tabla nueva para `rating-highlights`.
- **Servicios**: `services/profiles/showcase.ts`, `services/profiles/affinity.ts`,
  `services/profiles/stats.ts` (huella de gusto), `services/favorites/favorites.ts` (default
  de audiencia), `services/diary/diary.ts`.
- **UI**: `app/[locale]/users/[username]/page.tsx` y `sections.tsx` (recomposición de
  niveles y layout único dueño/visitante), componente de "Exploración" (indicador de
  afinidad inline).
- **Contratos**: sin ruptura de forma de API conocida, salvo el nuevo default de audiencia
  de favoritos (comportamiento, no forma) y los endpoints nuevos de `rating-highlights` y de
  destacar entradas de diario.
