# ADR 0035 — Colecciones destacadas del día 0: plantillas sin comunidad, carátulas garantizadas y señal de calidad

## Estado

Aceptado (cambio `add-day-zero-collections`, 2026-10). Extiende [ADR 0033](0033-colecciones-destacadas-generadas-por-plantillas.md)
y se apoya en la consola de [ADR 0034](0034-consola-editorial-de-destacadas.md).

## Contexto

Al salir a producción el riel necesita seis tarjetas desde el primer día. Medido en el scratch con datos reales:
sin comunidad (1 valoración, 0 reseñas) `top-rated-quarter` y `most-reviewed-month` no producen nada; solo ~23 % de los
`studio` tiene carátula resuelta (180 de 793) y casi ninguna nominación de premios la tiene aún, porque la resolución
es perezosa; en cambio hay ganadores de premios con señal de calidad externa, fechas completas en el 87 % de los
`studio` y géneros efectivos en casi todo el catálogo.

## Decisión

1. **Seis plantillas que no dependen de la comunidad:** `new-releases` (por popularidad del calendario de
   ListenBrainz), `grammy-winners` (ganadores de la última ceremonia cargada), `genre-spotlight` (una familia de
   géneros por semana, un álbum por era), `anniversaries` (aniversarios del mes), `upcoming` (próximos del calendario)
   y `one-per-decade`. `top-rated-quarter` y `most-reviewed-month` se conservan y nacen con peso 10, así que pasan por
   delante dentro del tope de 6 cuando haya comunidad.
2. **`plan(now)` asíncrono** en lugar de `periodKey/title/select`: devuelve período, título y candidatos con holgura
   (`CANDIDATE_POOL` = 36) o un `skip` con el motivo. El período del premio y el del género dependen de datos. Reanudar
   una plantilla devuelve al riel su fila más reciente, no la de un período calculado.
3. **Carátulas resueltas al generar** (`collections/covers.ts`). El resolvedor recorre los candidatos en orden, usa
   `findOrResolveCover` (Cover Art Archive, sin la cola de MusicBrainz), 4 en paralelo y un presupuesto de 40 peticiones
   por corrida, descarta los que CAA no confirma y recuerda cada veredicto durante la corrida. Las plantillas por cubeta
   (`one-per-decade`, `genre-spotlight`) lo usan para probar el siguiente candidato de la misma década o era.
4. **Señal de calidad común** (`collections/signal.ts`) para ordenar y desempatar: promedio de valoraciones con umbral →
   ganador antes que nominado → rango de popularidad del calendario → carátula resuelta → id. Con comunidad, la primera
   domina.
5. **Era de 5 años en `genre-spotlight`.** Con décadas solo caben 7 álbumes y casi ninguna familia llega a 6. El
   período incluye la familia (`AAAA-Www-<familia>`): si una semana hay que saltar a otra familia, es otra lista y la
   anterior vence, nunca una lista con título y contenido de familias distintas.
6. **`--dry-run`** en `sync-explore-collections.ts`: planifica y verifica carátulas igual que la generación, sin crear
   listas, filas destacadas ni corridas, e imprime el motivo cuando una plantilla no llega a 6. Es la comprobación previa
   al lanzamiento.
7. **Sin migración.** Todo cabe en el esquema de `0069` y `0070`.

## Alternativas descartadas

- **Mantener `periodKey/title/select` síncronos** con una consulta previa para el premio y el género: duplica la
  elección y puede desincronizar período y contenido.
- **Resolver carátulas en cada plantilla:** repetido y sin presupuesto común.
- **Otra fuente de popularidad** (más APIs): fuera de alcance; se usa lo ya sincronizado de ListenBrainz.
- **Subir el tope a 8 tarjetas** para dar cabida a las de comunidad: cambia una regla de producto sin necesidad.
- **Décadas en `genre-spotlight`:** ver decisión 5.

## Consecuencias

- La primera corrida con carátulas sin resolver tarda ~70 s (peticiones a CAA); lo resuelto queda guardado.
- `genre-spotlight` crea una lista pública por semana (~52 al año); vencen y siguen accesibles por URL.
- `new-releases` y `upcoming` se parecen a los rieles de Novedades y Próximos lanzamientos; se distinguen por el orden
  (popularidad frente a fecha). Si molesta, el cupo se cambia sin tocar el modelo.
- `one-per-decade` sigue siendo débil sin comunidad (los premios solo respaldan 2010–2020); mejora sola con uso.
- Los títulos se guardan en español (una sola cadena por lista), como las plantillas de ADR 0033.
