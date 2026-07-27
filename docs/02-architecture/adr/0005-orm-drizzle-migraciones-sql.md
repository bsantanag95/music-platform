# ADR 0005 — Drizzle ORM con migraciones en SQL, en vez de Prisma

**Estado:** Aceptado

## Contexto

El esquema (`03-data/sql-model.md` / `schema.sql`) depende de piezas que la mayoría de los ORMs no modelan de forma declarativa: `CHECK constraints` que combinan varias columnas (coherencia estrellas↔valoración detallada), triggers (validación de tipos en `MEMBERSHIP`, `updated_at` en `RATING`), e índices únicos parciales (`WHERE ... IS NOT NULL`) que resuelven el modelo polimórfico de `CREDIT` y `RATING`.

## Decisión

Usar Drizzle ORM junto con `drizzle-kit` para las migraciones, en vez de Prisma.

## Justificación

- Drizzle es "SQL-first": el `schema.ts` que da autocompletado y queries tipadas convive con migraciones en SQL crudo como flujo normal, no como un escape hatch aislado que se pierde en la siguiente migración automática.
- El `schema.sql` ya diseñado se usa directamente como la primera migración versionada, sin traducción con pérdida.
- Los triggers y `CHECK` cruzados quedan versionados en Git como parte del historial real de migraciones, en vez de vivir como parches manuales por fuera del sistema de migraciones.

## Alternativas consideradas

- **Prisma**: mejor experiencia de desarrollo para un esquema simple, pero no soporta de forma nativa `CHECK constraints` multi-columna ni triggers, y los índices únicos parciales requieren editar a mano el SQL que genera — ese parche manual es fácil de perder en migraciones futuras.
- **Sin ORM (SQL crudo + un query builder ligero como Kysely)**: viable, pero se descartó por ahora porque Drizzle ya da ese nivel de control sin renunciar al tipado automático de las queries del día a día.

## Consecuencias

Las migraciones nuevas que necesiten `CHECK`/triggers se escriben como SQL crudo dentro del flujo de `drizzle-kit`, no se delega su generación automática al ORM.
