# ADR 0002 — PostgreSQL en vez de una base NoSQL

**Estado:** Aceptado

## Contexto

El dominio tiene relaciones reales y de varios niveles: artistas que son miembros de bandas, álbumes con múltiples ediciones, canciones que aparecen en múltiples discos, créditos con orden y rol. Además, algunas reglas de negocio (coherencia entre estrellas y valoración detallada, unicidad de valoración por usuario y objetivo) necesitan poder aplicarse con garantías fuertes, no solo a nivel de aplicación.

## Decisión

Usar PostgreSQL como base de datos principal.

## Justificación

- Las relaciones del dominio (`MEMBERSHIP`, `CREDIT`, `TRACK`) son consultas relacionales naturales; forzarlas a documentos anidados en una base NoSQL solo desplazaría esa complejidad al código de la aplicación.
- Los `CHECK constraints` y triggers permiten proteger reglas de negocio críticas (la coherencia estrellas/detallada, la validez de `MEMBERSHIP`) directamente en la base, de forma que ningún cliente, script de importación o bug de la aplicación pueda violarlas.
- Los índices únicos parciales resuelven con precisión el modelo polimórfico de `CREDIT` y `RATING` sin sacrificar integridad referencial real (ver `03-data/sql-model.md`).

## Alternativas consideradas

- **MongoDB u otra base documental**: descartada — el dominio es fuertemente relacional y las garantías de integridad que necesita el modelo de rating dual son más naturales en un motor relacional con constraints.

## Consecuencias

Ninguna limitación relevante para el alcance actual del proyecto. Se revisará si en el futuro aparece una necesidad concreta de escritura masiva no relacional (por ejemplo, logs de actividad a muy alto volumen) que justifique una base secundaria especializada.
