# music-platform — Documentación

Nombre de trabajo provisional del proyecto: **music-platform** (puede cambiar sin costo estructural — nada del código ni de la arquitectura depende de este nombre).

Este directorio es la fuente de verdad técnica y de producto del proyecto. Se prioriza mantenerlo corto y actualizado por encima de tenerlo completo — un documento desactualizado es peor que no tenerlo.

## Índice y fuente de verdad

| Documento | Responde a | Estado |
|---|---|---|
| `00-product/vision.md` | Filosofía, público objetivo, diferenciación, qué NO hará el producto | ✅ |
| `00-product/prd.md` | Problema, propuesta de valor, MVP, métricas de éxito | ✅ |
| `00-product/roadmap.md` | Fases de construcción, de la 0 a la 6 | ✅ |
| `01-domain/domain-model.md` | Entidades del negocio y sus relaciones (sin SQL) | ✅ |
| `01-domain/business-rules.md` | Reglas de negocio explícitas (remaster, rating dual, etc.) | ✅ |
| `02-architecture/architecture.md` | Frontend → API → servicios → base de datos → servicios externos | ✅ |
| `02-architecture/conventions.md` | Convenciones de nombres, formatos, estilo | ✅ |
| `02-architecture/auth.md` | Diseño operativo de autenticación local, sesiones e identidades externas | ✅ Autenticación local implementada; OAuth preparado |
| `02-architecture/adr/` | Registro de decisiones de arquitectura, una por archivo (0001-pwa-vs-nativa, 0002-postgresql-vs-nosql, 0003-uuid-vs-autoincremental, 0004-modelo-credit-colaboraciones, 0005-orm-drizzle-migraciones-sql, 0006-rest-vs-trpc, 0007-i18n-next-intl, 0008-auth-sesiones-y-hash-contrasena, 0009-borrado-fisico-rating-comment, 0010-identidades-externas-y-proveedores-oauth) | ✅ |
| `02-architecture/i18n.md` | Arquitectura de internacionalización: next-intl, segmento `[locale]`, catálogos de mensajes, reglas de traducción | ✅ Implementada |
| `02-architecture/code-walkthrough.md` | Explicación archivo por archivo del código de las Fases 1 y 2, y el flujo de una búsqueda | ✅ |
| `02-architecture/frontend-plan/` | Plan de implementación del frontend (Fase 3): análisis de backend, arquitectura de frontend, etapas, buenas prácticas y riesgos — ver su propio índice en `frontend-plan/README.md` | 🟢 Fase 3 completa, lista para revisión con usuarios |
| `03-data/sql-model.md` | Esquema SQL narrado: propósito y relaciones de cada tabla | ✅ |
| `03-data/data-licensing.md` | Licencias de MusicBrainz y Cover Art Archive, y sus implicancias | ✅ |
| `04-api/contracts.md` | Contrato real de los endpoints REST de catálogo, auth y funciones sociales | ✅ |
| `04-api/errors.md` | Convención de errores de la API — código `code` machine-readable | ✅ Implementada |
| `05-features/` | Especificaciones de producto por feature (catálogo, valoraciones, diario de escucha, listas, feed) — ver su propio índice en `05-features/README.md` | 🟡 Fase 3 lista, resto en distintos niveles de madurez |

## Regla de mantenimiento

- No se modifica un documento importante sin revisar el impacto en los demás.
- Las decisiones de arquitectura relevantes se registran como ADR individual en `02-architecture/adr/`, no se sobreescribe el razonamiento anterior.
- Este `README.md` se actualiza cada vez que se agrega o cambia de estado un documento.
