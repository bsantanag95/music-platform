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
| `02-architecture/adr/` | Registro de decisiones de arquitectura, una por archivo (0001-pwa-vs-nativa, 0002-postgresql-vs-nosql, 0003-uuid-vs-autoincremental, 0004-modelo-credit-colaboraciones, 0005-orm-drizzle-migraciones-sql) | ✅ |
| `03-data/sql-model.md` | Esquema SQL narrado: propósito y relaciones de cada tabla | ✅ |
| `03-data/data-licensing.md` | Licencias de MusicBrainz y Cover Art Archive, y sus implicancias | ✅ |

## Regla de mantenimiento

- No se modifica un documento importante sin revisar el impacto en los demás.
- Las decisiones de arquitectura relevantes se registran como ADR individual en `02-architecture/adr/`, no se sobreescribe el razonamiento anterior.
- Este `README.md` se actualiza cada vez que se agrega o cambia de estado un documento.
