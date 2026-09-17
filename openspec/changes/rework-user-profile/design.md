## Context

El perfil (`/[locale]/users/[username]`) compone hoy un árbol único de componentes con tres
niveles de acceso (no autorizado, autorizado, dueño — `social-profiles`), pero sin jerarquía
de profundidad: identidad curada (destacados, himno), actividad (en rotación, reseñas) y
estadística (huella de gusto) se muestran con el mismo peso y en un orden fijo. La vista del
dueño hoy recompone el perfil en un layout de una sola columna distinto del de un visitante
autorizado (dos columnas). Ya existen tres precedentes de "fijar = destacar" en el código:
`userAlbumPin`/"Álbumes favoritos", `user_list_pin`/"Fijar listas propias" y
`user_list_featured` (señal de distribución editorial, deliberadamente en tabla aparte para
no disparar eventos de `updated_at`/feed). Este cambio extiende ese mismo patrón a
valoraciones y entradas de diario, y reordena la composición existente — no reemplaza
ninguno de los cálculos ya especificados (afinidad, huella de gusto, en rotación, reseñas).

La dirección visual ya fue resuelta con la skill `impeccable` sobre el sistema de diseño real
del proyecto ("The Vinyl Listening Room" — `DESIGN.md`: paleta ink/paper/amber/petrol,
tríada tipográfica Space Grotesk/Source Serif 4/IBM Plex Mono, silueta de disco
(`DiscPlaceholder`) para arte faltante, profundidad tonal sin sombras, radios 4–10px nunca
pill, ámbar con la regla de rareza ≤10% de pantalla) y existe como referencia visual (canvas
de diseño) fuera de este repositorio de specs. Este documento no repite esa dirección en
detalle; la referencia obligatoria para implementar la UI es `DESIGN.md` y los componentes
ya existentes (`DiscPlaceholder`, `Button`, tokens de `globals.css`).

## Goals / Non-Goals

**Goals:**
- Reorganizar la composición del perfil en 3 niveles de profundidad (identidad en segundos,
  exploración en minutos, inmersión bajo demanda) sin romper los contratos REST existentes,
  salvo los explícitamente marcados **BREAKING** en la propuesta.
- Unificar la composición estructural entre la vista del dueño y la de un visitante
  autorizado; las capas de edición del dueño se superponen, no reemplazan la estructura.
- Extender el patrón ya existente "fijar = curar + hacer público" (álbumes favoritos,
  listas) a valoraciones y entradas de diario, y a los destacados existentes (marcador
  "me define").
- Aplicar la dirección visual ya resuelta de forma consistente con `DESIGN.md`, reutilizando
  componentes existentes en vez de introducir un lenguaje visual paralelo.

**Non-Goals:**
- No se rediseña el cálculo de afinidad, huella de gusto, en rotación ni reseñas — su lógica
  y sus requisitos existentes se preservan intactos.
- No se toca `artist-journey` ("Recorridos de artista"): sigue siendo una faceta anidada de
  "Exploración", no pasa a sección de primer nivel.
- No se introduce score de compatibilidad, ranking ni ninguna forma de gamificación.
- No se introduce recomendación algorítmica ni personalización fuera del grafo social
  explícito (principio ya establecido en `PRODUCT.md`).
- No se define en este change el mecanismo exacto de "editor de valoraciones destacadas" en
  el detalle de UI (formularios, componentes React concretos) más allá de lo que fijan las
  specs — eso es trabajo de implementación guiado por `tasks.md`.

## Decisions

**1. El marcador "me define" es una referencia directa en `user_showcase`
(`definingArtistId`/`definingReleaseGroupId`), no un booleano sobre los destacados
existentes.** Decisión revisada tras el primer uso real (migración 0030): la versión
original agregaba `is_defining` a `user_pinned_item` para reutilizar su infraestructura
(curaduría manual, orden, borrado en cascada). En la práctica esto dejaba "Álbumes
favoritos" (`user_album_pin`, una lista separada a propósito de Destacados) sin ninguna vía
para marcar un álbum definitorio salvo agregándolo *de nuevo* como destacado genérico —
duplicado, confuso, y el gap que motivó esta revisión. Al mover el marcador a una referencia
directa (mismo criterio que ya usa `anthemRecordingId` para el himno: cualquier entidad
válida del catálogo, sin requerir que sea además un destacado o un favorito), cualquier
superficie que muestre un artista o álbum puede ofrecer el marcador, y la exclusividad por
tipo es trivial (una sola columna nullable por usuario, sin índice único parcial). El riesgo
de "dos fuentes de verdad" que motivó la versión original no se materializó: el marcador
nunca fue la fuente de verdad de si algo ES un destacado o un favorito, solo de si algo es
la elección definitoria — son preguntas independientes.

**2. Valoraciones y entradas de diario destacadas viven en tablas de señal aparte
(`rating_highlight`, `listen_entry_highlight`), no como columnas en `rating`/`listen_entry`.**
Sigue el precedente ya documentado de `user_list_featured` y `user_list_pin`: una tabla de
señal separada evita tocar `updated_at` de la fila subyacente y, con ello, evita disparar
eventos de feed no deseados al destacar algo. Alternativa descartada: columna
`isHighlighted` directamente en `rating`/`listen_entry` — más simple de leer, pero
acoplaría "destacar" a la fila que el resto del sistema (feed, `updated_at`) ya observa.

**3. La huella de gusto no se recalcula: se le pide un resumen cualitativo adicional.**
`taste-fingerprint` ya calcula distribución, crestas y reparto bajo demanda, filtrados por
audiencia. El resumen de 2–3 frases para Nivel 1–2 se deriva de los mismos datos ya
calculados (no una nueva fuente), como una proyección textual adicional del mismo servicio.

**4. El default de audiencia de favoritos cambia a nivel de aplicación (no de columna de
base de datos), aplicado solo en el camino de creación.** Mantiene el mismo mecanismo que
`favorites` ya usa (`audience` default `followers` hoy) sin migrar filas existentes: es un
cambio de comportamiento en el servicio de creación, no una migración de datos.

**5. La reordenación de secciones y la unificación de layout dueño/visitante se resuelven en
la composición de Server Components existente (`page.tsx`/`sections.tsx`), sin introducir
estado de cliente nuevo.** Los datos de cada sección ya se cargan en el servidor bajo
`Suspense` independiente; reordenar es un cambio de composición, no de arquitectura de
datos. Las interacciones nuevas (destacar una valoración o una entrada de diario) son las
únicas superficies que necesitan un client component con mutación vía TanStack Query, igual
que el resto de las acciones de fijado ya existentes (`userAlbumPin`, `user_list_pin`).

## Risks / Trade-offs

- **[Riesgo]** Cambiar el default de audiencia de favoritos nuevos a `public` puede
  sorprender a quien asume el comportamiento anterior → **Mitigación**: no retroactivo (solo
  favoritos nuevos); documentarlo en el changelog visible del producto.
- **[Riesgo]** Las valoraciones y entradas de diario destacadas rompen, por primera vez, la
  garantía de que ninguna valoración es visible para alguien fuera de la relación de
  seguimiento → **Mitigación**: es una acción explícita y por ítem del propio usuario
  (opt-in expreso, nunca un default), acotada a un máximo (6) por tipo.
- **[Riesgo]** Reordenar `social-profiles` puede romper pruebas existentes que asumen el
  orden anterior de secciones → **Mitigación**: `tasks.md` incluye actualizar esas pruebas
  como parte del mismo cambio, no como seguimiento posterior.
- **[Riesgo]** La Tarjeta de Identidad depende de que el usuario marque manualmente un
  artista o álbum como definitorio; ningún perfil existente lo tendrá al desplegar →
  **Mitigación**: aceptable y consistente con el principio ya vigente para el himno ("nunca
  se deriva de actividad"); la Tarjeta de Identidad se compone con lo que exista, sin huecos.

## Migration Plan

1. Migraciones de esquema (archivos nuevos, nunca editar migraciones aplicadas): referencias
   `defining_artist_id`/`defining_release_group_id` en `user_showcase` (0030, revisa la
   versión con marcador sobre `user_pinned_item` de 0029); tabla `rating_highlight`; tabla
   `listen_entry_highlight`. Todas nullable/vacías al crearse, sin backfill.
2. Cambio de comportamiento en el servicio de favoritos (default `public` en el camino de
   creación), sin migración de datos.
3. Recomposición de `sections.tsx`/`page.tsx` según el nuevo orden de `social-profiles` y el
   layout único dueño/visitante.
4. Actualizar las pruebas de composición del perfil que dependían del orden anterior.
5. **Rollback**: todas las migraciones son aditivas (tablas y columnas nuevas, nullable);
   revertir es una migración de baja que las elimina sin pérdida de datos preexistentes. El
   cambio de default de favoritos se revierte cambiando el valor por defecto del servicio,
   sin tocar filas ya creadas en ningún sentido.

## Open Questions

- ¿Dónde vive hoy, exactamente, la valoración suelta (`rating`) en el código — servicio
  propio o parte de `album-review`? Confirmar antes de implementar `rating-highlights` para
  no duplicar lógica de acceso a valoraciones.
- El límite de 6 para valoraciones y entradas de diario destacadas se eligió por paridad con
  "Álbumes favoritos" (también 6); es una constante nombrada, ajustable sin romper la spec.
- ¿Hace falta un aviso in-app la primera vez que se crea un favorito tras el cambio de
  default? Queda fuera del alcance de este change tal como está propuesto.
