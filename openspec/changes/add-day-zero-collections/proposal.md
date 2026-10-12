## Why

Al salir a producción el riel "Colecciones destacadas" debe mostrar 6 tarjetas desde el día 0. Hoy las
plantillas dependen de la comunidad (`top-rated-quarter`, `most-reviewed-month`) y quedarían vacías: el día
0 no hay valoraciones ni reseñas. Además, en el catálogo solo una fracción de los discos tiene carátula
resuelta (en scratch: 180 de 793 `studio`, y apenas 43 comprobados), así que una colección armada sin
resolver carátulas se vería rota. Hacen falta plantillas que se apoyen en datos exógenos o estructurales
(premios, calendario de lanzamientos, fechas, géneros) y un generador que garantice carátulas.

## What Changes

- Cuatro plantillas nuevas que funcionan sin comunidad: **Ganadores del Grammy {año}**, **Cumplen años en
  {mes}**, **Para entrar a {género}** (una familia de géneros por semana) y **Lo que viene** (próximos
  lanzamientos del calendario).
- **Novedades esenciales** pasa a ordenarse por popularidad del calendario de ListenBrainz (antes, por fecha).
  **Un disco por década** se conserva y su desempate mejora con la señal de calidad.
- Las seis son el conjunto del día 0. `top-rated-quarter` y `most-reviewed-month` siguen registradas y se
  activan solas cuando hay comunidad; al crearse con un peso mayor desplazan a las más débiles del tope de 6.
- El generador **resuelve las carátulas** de los discos elegidos (Cover Art Archive, sin pasar por la cola de
  MusicBrainz) y descarta los que no tienen, completando desde los siguientes candidatos.
- **Señal de calidad común** como criterio de ordenación y desempate cuando no hay comunidad: valoración
  (con umbral) → ganador/nominado a un premio → popularidad del calendario → carátula → id.
- Interfaz de plantilla: pasa de `periodKey/title/select` síncronos a un `plan(now)` asíncrono que devuelve
  período, título y candidatos (el período y el título de Grammy y de género dependen de datos).
- `scripts/sync-explore-collections.ts --dry-run`: informa qué elegiría cada plantilla y por qué una no llega
  al mínimo, sin escribir. Es la verificación previa al lanzamiento.
- Reanudar una plantilla devuelve al riel su colección más reciente (antes, la de un período calculado en
  síncrono).
- Guía de **puesta en marcha del día 0** en `explore.md` (orden: taxonomía de géneros, premios, calendario,
  generación).
- Sin migración: todo cabe en el esquema de `0069`/`0070`.

## Capabilities

### New Capabilities
- `explore-day-zero-templates`: reglas de las plantillas del día 0 (Grammy, aniversarios, género de la
  semana, lo que viene), de Novedades esenciales y de Un disco por década, y su mínimo de álbumes con carátula.

### Modified Capabilities
- `explore-collection-generation`: se agregan requisitos de resolución de carátulas al generar, orden por
  señal de calidad y simulación sin escritura (`--dry-run`).

## Goals / Non-Goals

**Goals:**
- Seis colecciones con carátulas y contenido válido el día 0, sin actividad de la comunidad.
- Poder verificar antes del lanzamiento, sin escribir, que las seis llegan al mínimo.
- Que la comunidad tome el relevo sola cuando exista.

**Non-Goals:**
- Datos nuevos de popularidad externa (no se integra otra API; solo lo ya sincronizado de ListenBrainz).
- Curaduría manual del contenido de las listas (sigue siendo la consola de `manage-explore-featured-console`).
- Ingestar catálogo nuevo desde MusicBrainz para llenar las colecciones: solo se usa lo que ya está o lo que
  traen los premios y el calendario (Principio 4, el catálogo crece por uso).
- Cambiar el tope de 6 tarjetas ni el modelo de `user_list_featured`.

## Impact

- Código: `src/services/discovery/collections/` (`templates.ts`, `generate.ts`, nuevos `signal.ts`, `covers.ts`
  y plantillas), `sync.ts`, `src/services/discovery/featured.ts` (`resumeTemplate`),
  `scripts/sync-explore-collections.ts`, mensajes de nombres de plantilla (`messages/{es,en}`).
- Lecturas: premios (`award_*`), `release_calendar_entry`, taxonomía de géneros (`release_group_effective_genre`).
- Docs: `explore.md`, ADR 0035, `AGENTS.md` (smoke test ampliado). Sin cambios de contrato REST.
- Sin dependencias nuevas ni migraciones.
