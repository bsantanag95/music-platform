# Feed de actividad — "qué está escuchando" tu círculo

**Fase:** 5 (roadmap). **Estado:** ⚪ conceptual — el razonamiento detallado ya existe en
`listening-diary-and-ratings.md` (secciones 5 y 7); este documento es un puntero corto,
no una duplicación.

## Qué es

La función inspirada en el "qué estás escuchando" de MSN (`00-product/vision.md`): ver en
tiempo casi real lo que las personas que seguís están registrando, valorando o
comentando. Es la pieza central de la diferenciación frente a Spotify/Apple Music, cuya
capa social es mínima.

## De dónde sale el contenido del feed

Ver `listening-diary-and-ratings.md`, sección 5, para el detalle completo. Resumen:

- Nueva entrada del diario de escucha (`listen_entry`), con o sin texto/reacción.
- Cambio de valoración vigente (`rating.stars`) respecto al valor anterior.
- Nuevo comentario.

No se materializa una tabla de eventos aparte desde el día uno — se computa como una unión
ordenada por fecha de las tres fuentes de arriba, filtrada por a quién sigue el usuario.
Materializar el feed es una optimización a evaluar según volumen real, no un prerequisito.

## Descubrimiento social pasivo

También descrito en `listening-diary-and-ratings.md`, sección 7: en vez de un motor de
recomendación algorítmico (explícitamente descartado en `vision.md`), el patrón "gente que
amó X también amó Y" se resuelve como una query de co-valoración sobre `rating`, no como
un modelo de recomendación.

## Qué falta para que esto sea implementable

El grafo social (a quién sigue un usuario) todavía no existe en ningún documento — ni
siquiera a nivel conceptual. Es un prerrequisito de este feature que no se puede resolver
acá; corresponde a una sesión de diseño propia cuando se llegue a Fase 5, junto con las
preguntas abiertas de `lists-and-favorites.md`.
