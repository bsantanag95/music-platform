# Feed de actividad — "qué está escuchando" tu círculo

**Fase:** 5 (roadmap). **Estado:** ✅ Feed implementado con escuchas, favoritos, eventos de
listas (cambio `add-favorites-and-lists`), ratings vigentes y comentarios (cambio
`add-ratings-comments-feed`).

## Qué es

La función inspirada en el "qué estás escuchando" de MSN (`00-product/vision.md`): ver en
tiempo casi real lo que las personas que seguís están registrando, valorando o
comentando. Es la pieza central de la diferenciación frente a Spotify/Apple Music, cuya
capa social es mínima.

## Feed — cinco fuentes (add-diary-social-surfaces + add-favorites-and-lists + add-ratings-comments-feed)

El feed muestra las actividades de los usuarios seguidos (relación `accepted`) que sean
visibles para el lector, en orden cronológico descendente con paginación. Se implementa como
`GET /api/me/feed` y se visualiza en `/<locale>/me/feed`.

### Tipos de actividad

- **Escucha** (`kind: "listen"`): entrada del diario, con contexto, reacción y audiencia.
- **Favorito** (`kind: "favorite"`): marca de favorito sobre artista/álbum/canción.
- **Evento de lista** (`kind: "list"`): creación (`event: "created"`) o actualización de
  metadatos (`event: "updated"`, con fecha `updated_at`). No se genera un evento por ítem.
- **Rating** (`kind: "rating"`): valoración **vigente** de un usuario sobre un objetivo. Un
  cambio de valoración reemplaza la entrada anterior (no se muestra historial); la fecha
  mostrada es la de `updated_at`.
- **Comentario** (`kind: "comment"`): cada comentario genera su propia entrada — un usuario
  puede tener varias entradas de comentario sobre el mismo objetivo.

La composición se calcula **bajo demanda** uniendo las cinco fuentes (no hay tabla de eventos
materializada), ordenando por `created_at DESC` con desempate por fuente e id. La paginación
consulta una página ampliada por fuente y la fusiona en memoria; materialización y
deduplicación se evalúan con volumen real.

### Reglas de visibilidad

La matriz de visibilidad (`audiencesForProfile`, ahora compartida en
`src/services/social/visibility.ts`) determina qué actividades ve el lector:
- Bloqueo en cualquier dirección → nada.
- Dueño → todas.
- Perfil privado y no seguidor aprobado → nada (ni las públicas).
- Seguidor aprobado → `public` + `followers`.
- Resto → solo `public`.

El feed aplica esta lógica filtrando `user_id IN (seguidos aceptados)` +
`audience IN (followers, public)` + `NOT EXISTS` defensivo sobre `user_block` para cada fuente
que tiene audiencia propia (escucha, favorito, lista).

`rating` y `comment` **no tienen columna de audiencia** (a diferencia de las otras tres
fuentes): en la vista de catálogo son siempre públicos. Para el feed se tratan como
audiencia `public` implícita, filtrados solo por `user_id IN (seguidos aceptados)` +
bloqueo. Como `audiencesForProfile` siempre incluye `"public"` cuando la relación es
`following` (aceptada), pertenecer a los seguidos ya equivale a tener permiso para ver esa
actividad — no hace falta una audiencia explícita. Ver `design.md` del cambio
`add-ratings-comments-feed`.

### Pendiente para v2+

- Deduplicación de eventos (un usuario que registra escucha + cambia rating en la misma sesión).
- Materializar el feed como tabla de eventos si el volumen lo justifica.
- Keyset pagination en lugar de offset.
- Audiencia por actividad para rating/comment (alineado con el diseño maestro de Fase 5,
  fuera de alcance de `add-ratings-comments-feed` por requerir migración de esquema).

## De dónde sale el contenido del feed

Ver `listening-diary-and-ratings.md`, sección 5, para el detalle completo. Resumen:

- Nueva entrada del diario de escucha (`listen_entry`), con o sin texto/reacción.
- Cambio de valoración vigente (`rating.stars`) respecto al valor anterior.
- Nuevo comentario.

No se materializa una tabla de eventos aparte desde el día uno — se computa como una unión
ordenada por fecha de las fuentes, filtrada por a quién sigue el usuario.

## Descubrimiento social pasivo

También descrito en `listening-diary-and-ratings.md`, sección 7: en vez de un motor de
recomendación algorítmico (explícitamente descartado en `vision.md`), el patrón "gente que
amó X también amó Y" se resuelve como una query de co-valoración sobre `rating`, no como
un modelo de recomendación.

## Grafo social

El grafo social (seguimiento unilateral) ya existe desde el cambio `add-social-profile-follow`.
Las reglas de visibilidad del feed dependen de él (relación `accepted` + ausencia de bloqueo).