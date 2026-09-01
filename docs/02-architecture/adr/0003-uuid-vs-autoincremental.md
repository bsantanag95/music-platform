# ADR 0003 — UUID en vez de IDs autoincrementales

**Estado:** Aceptado

## Contexto

Gran parte del catálogo (artistas, álbumes, canciones) se sincroniza desde una fuente externa (MusicBrainz) mediante el patrón de cacheo bajo demanda. Cada entidad de MusicBrainz ya tiene su propio identificador único (`mbid`, un UUID).

## Decisión

Usar `UUID` como clave primaria en todas las tablas, en vez de IDs autoincrementales.

## Justificación

- Evita colisiones de ID al sincronizar datos desde una fuente externa que también usa UUID.
- Permite generar el ID de una entidad en el cliente o en el servicio de ingesta antes de insertarla, sin depender de una vuelta a la base de datos.
- No expone el volumen ni el orden de creación de registros a través de la URL, a diferencia de un ID autoincremental secuencial.

## Alternativas consideradas

- **ID autoincremental (`SERIAL`/`BIGSERIAL`)**: descartado — más simple y algo más liviano en índices, pero genera fricción real al sincronizar con MusicBrainz y expone información de volumen del catálogo.

## Consecuencias

Índices ligeramente más pesados que con enteros autoincrementales; se considera un costo aceptable dado el volumen esperado del proyecto en sus primeras fases.

## Notas relacionadas (addendum)

- **Trade-off de localidad de inserción (no documentado por la decisión original).** El `UUID` de este ADR es v4 aleatorio (`gen_random_uuid()`). A diferencia de un `BIGSERIAL` o un UUID v7 (monótonos crecientes), cada `INSERT` en las tablas de alto volumen cae en una posición impredecible del B-tree de la PK, lo que a volumen alto produce fragmentación del índice (peor cache hit, más I/O) y mayor ocupación (16 bytes vs 8 por entrada). Aquí solo se reconoció el peso del índice, no la localidad. Se registra como **diferido**: ver Riesgo #12 en `frontend-plan/04-risks.md` y C.11 en `scalability-infrastructure.md`. La razón del catálogo para UUID (mbid externo) no aplica a las PK internas de `rating`/`comment`/`listen_entry` (no se sincronizan con MusicBrainz), así que ante señal real podrían migrar a secuencial/UUID v7 sin fricción de fuente externa. La decisión en sí no se reabre aquí — es registro histórico.
