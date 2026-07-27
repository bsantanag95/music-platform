# PRD — music-platform

## Problema

Las plataformas existentes para catalogar y opinar sobre música son, o bien exhaustivas pero sin capa social atractiva (RateYourMusic, Discogs), o bien plataformas de streaming con funciones sociales muy limitadas (Spotify, Apple Music). Ninguna resuelve bien, a nivel de datos, situaciones reales de la industria: una canción que aparece en múltiples discos, ediciones distintas de un mismo álbum, artistas que son solistas y miembros de banda a la vez, o colaboraciones y features.

## Usuario objetivo

Oyentes activos que quieren llevar un registro curado de su historial musical, discutir discografías con precisión (ediciones, remasters, colaboraciones), y recuperar la experiencia social de ver en tiempo real qué está escuchando su círculo — algo que el streaming actual no ofrece.

## Propuesta de valor

- Sistema de valoración dual (estrellas + valoración detallada de 1-100), siempre coherente entre sí.
- Estructura de datos fiel a cómo funciona realmente la industria musical (feat., ediciones múltiples, re-grabaciones vs. remasters).
- Capa social de descubrimiento pasivo: ver qué escuchan otros usuarios, no solo recibir recomendaciones algorítmicas.

## Objetivos del producto

1. Validar que el modelo de datos (artista/banda, créditos, ediciones, grabaciones) funciona correctamente contra discografías reales y complejas.
2. Lograr que catalogar música puntuada sea una actividad recurrente y placentera, no una tarea de una sola vez.
3. Diferenciarse socialmente de las plataformas de streaming en la dimensión que ellas no cubren: compartir y descubrir lo que otros escuchan.

## MVP

Alcance mínimo viable (corresponde a las fases 3 y 4 del roadmap):
- Catálogo navegable de artistas, álbumes y canciones (solo lectura, sin cuentas).
- Autenticación de usuarios.
- Valoración dual (estrellas + detallada) y comentarios en los tres niveles: artista, álbum, canción.

Quedan fuera del MVP (fases posteriores): listas curadas, favoritos, actividad social tipo "qué estás escuchando", y la propia PWA instalable.

## Roadmap

Ver `00-product/roadmap.md` para el detalle de las 7 fases (0 a 6), desde cerrar el modelo de datos hasta el lanzamiento en beta cerrada.

## Restricciones

- Plataforma inicial: PWA, no aplicación nativa (ver ADR correspondiente).
- Dependencia de datos externos: MusicBrainz (metadata) y Cover Art Archive (carátulas), cada uno con sus propios términos de licencia — ver `03-data/data-licensing.md`.
- Volumen de datos: millones de registros musicales existentes; se resuelve con un patrón de cacheo bajo demanda en vez de precarga total.

## Métricas de éxito (propuesta inicial, a refinar con datos reales de la beta)

- Porcentaje de usuarios que puntúan al menos 10 canciones/álbumes en su primera semana.
- Retención a 30 días de los usuarios de la beta cerrada.
- Promedio de valoraciones y comentarios por usuario activo mensual.
