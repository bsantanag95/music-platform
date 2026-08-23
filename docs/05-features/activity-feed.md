# Feed de actividad — "qué está escuchando" tu círculo

**Fase:** 5 (roadmap). **Estado:** 🟡 Feed v1 implementado (solo entradas del diario). Ratings,
comentarios, favoritos y listas se agregan en incrementos posteriores.

## Qué es

La función inspirada en el "qué estás escuchando" de MSN (`00-product/vision.md`): ver en
tiempo casi real lo que las personas que seguís están registrando, valorando o
comentando. Es la pieza central de la diferenciación frente a Spotify/Apple Music, cuya
capa social es mínima.

## Feed v1 — Solo diario (add-diary-social-surfaces)

El feed v1 muestra las entradas del diario (`listen_entry`) de los usuarios seguidos (relación
`accepted`) que sean visibles para el lector, en orden cronológico descendente con paginación
offset. Se implementa como `GET /api/me/feed` y se visualiza en `/<locale>/me/feed`.

### Reglas de visibilidad

La matriz de visibilidad (`audiencesForProfile` en `src/services/diary/visibility.ts`) determina
qué entradas ve el lector:
- Bloqueo en cualquier dirección → nada.
- Dueño → todas.
- Perfil privado y no seguidor aprobado → nada (ni las públicas).
- Seguidor aprobado → `public` + `followers`.
- Resto → solo `public`.

El feed aplica esta lógica filtrando `user_id IN (seguidos aceptados)` +
`audience IN (followers, public)` + `NOT EXISTS` defensivo sobre `user_block`.

### Pendiente para v2+

- Agregar ratings, comentarios, favoritos y listas al feed.
- Deduplicación de eventos (un usuario que registra escucha + cambia rating en la misma sesión).
- Materializar el feed como tabla de eventos si el volumen lo justifica.
- Keyset pagination en lugar de offset.

## De dónde sale el contenido del feed (v2+)

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
