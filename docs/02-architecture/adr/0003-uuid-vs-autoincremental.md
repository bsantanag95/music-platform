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
