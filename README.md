# music-platform

Nombre de trabajo del proyecto — puede cambiar más adelante sin costo estructural.

## Documentación

Toda la documentación de producto, dominio, arquitectura y datos vive en [`/docs`](./docs/README.md). Empezar por ahí, no por el código, antes de tocar cualquier parte del proyecto.

## Stack

- **Next.js** (App Router) — frontend + API en un solo proyecto TypeScript.
- **Drizzle ORM** + migraciones en SQL crudo — ver `docs/02-architecture/adr/0005-orm-drizzle-migraciones-sql.md`.
- **PostgreSQL** — ver `docs/02-architecture/adr/0002-postgresql-vs-nosql.md`.

## Desarrollo local

```bash
cp .env.example .env      # completar DATABASE_URL
pnpm install
pnpm run db:migrate        # aplica /drizzle/*.sql en orden
pnpm run dev
```

## Migraciones

Las migraciones son archivos SQL escritos a mano en `/drizzle`, no generados automáticamente — `0000_initial.sql` es el esquema completo diseñado en la Fase 0 (ver `docs/03-data/sql-model.md`). `pnpm run db:migrate` aplica los archivos pendientes en orden y registra cuáles ya se ejecutaron.
