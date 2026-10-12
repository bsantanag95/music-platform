## Why

El riel "Colecciones destacadas" de `/explore` se llena hoy con `scripts/seed-discovery.ts`: dos
colecciones fijas, sembradas a mano, que solo acumulan ítems y nunca rotan. En producción la propia
plataforma debe publicar contenido editorial con frecuencia, sin que alguien corra un script ni
despliegue. Es el primer paso (de dos): la generación automática. La gestión humana desde `/admin`
va en `manage-explore-featured-console`.

## What Changes

- Colecciones **generadas por plantillas**: reglas tipadas (novedades, mejor valorados del trimestre,
  un disco por década, lo más reseñado del mes) que producen listas públicas de `@exploracion`.
- **Refresco semanal bajo demanda, sin cron** (mismo patrón que el calendario de lanzamientos,
  ADR 0029): una visita a `/explore` programa con `after()` la regeneración de las plantillas cuya
  última corrida exitosa tiene más de 7 días; una sola a la vez (lock en tabla); un fallo conserva
  la versión anterior; `scripts/sync-explore-collections.ts` fuerza la corrida.
- **Reemplazo completo** de ítems en cada corrida (no acumulativo). Las plantillas con período
  (trimestre, mes) crean una lista nueva por período y vencen la anterior.
- `user_list_featured` gana origen (`curated` | `template`), clave de plantilla y de período,
  vigencia (`starts_at`/`expires_at`) y peso; `rank` deja de ser único global.
- El riel respeta la vigencia y muestra como máximo 6 tarjetas.
- `seed-discovery.ts` deja de definir colecciones propias: crea la cuenta curadora y ejecuta la
  misma generación. Las dos filas ya sembradas se adoptan como plantillas.
- Las listas generadas **no** aparecen en la consola editorial ni generan eventos de feed.
- ADR 0033, migración `0069`, docs y smoke test nuevos.

## Capabilities

### New Capabilities
- `explore-collection-generation`: plantillas, regeneración semanal bajo demanda con lock, reemplazo
  de ítems, períodos y vencimiento, mínimo de álbumes y conservación ante fallo.

### Modified Capabilities
- `album-discovery`: el requisito "Colecciones destacadas" pasa a respetar vigencia, orden por peso
  y rank, y un tope de tarjetas.

## Goals / Non-Goals

**Goals:**
- Que `/explore` tenga colecciones frescas en producción sin intervención.
- Dejar el modelo listo para la curaduría humana del cambio siguiente.

**Non-Goals:**
- UI de destacar/reordenar/pausar (cambio `manage-explore-featured-console`).
- Curaduría por archivo JSON (descartada a favor de la UI).
- Personalización por afinidad; el descubrimiento sigue siendo editorial y por reglas.
- Cron externo o infraestructura nueva.

## Impact

- Código: `src/services/discovery/` (plantillas, orquestador, lectura del riel), `src/app/[locale]/(catalog)/explore/page.tsx`
  (disparo con `after()`), `src/services/lists/editorial.ts` (excluir generadas), feed, `scripts/`.
- Datos: migración `0069` (`user_list_featured` ampliada, tabla `explore_collection_sync`) + `schema.ts`.
- Docs: `explore.md`, `sql-model.md`, ADR 0033, `AGENTS.md` (smoke test nuevo). Sin cambios de contrato REST.
- Sin dependencias nuevas.
