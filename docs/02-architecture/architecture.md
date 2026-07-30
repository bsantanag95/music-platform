# Arquitectura — music-platform

## Vista general

```
Frontend (PWA, Next.js)
        ↓
API (route handlers REST, Next.js App Router)
        ↓
Servicios de aplicación (ingesta/cache, auth, ratings)
        ↓
Base de datos (PostgreSQL)
        ↓
Servicios externos (MusicBrainz, Cover Art Archive, APIs de streaming)
```

## Responsabilidades por capa

**Frontend (Next.js, PWA).** Renderiza catálogo, perfiles, formularios de valoración/comentario. Responsable de la instalabilidad (manifest, service worker) y del shell offline definido en la Fase 6. No contiene lógica de negocio más allá de validación de UX — toda regla de negocio real (coherencia estrellas/detallada, unicidad de valoración por usuario) se valida también del lado del servidor y de la base de datos, nunca solo en el cliente.

**API (route handlers REST, Next.js App Router).** Expone los procedimientos que el frontend consume: búsqueda, lectura de catálogo, mutaciones de valoración/comentario, autenticación. Ver ADR 0006 sobre por qué REST en vez de tRPC (decisión original de este documento, corregida para reflejar lo efectivamente construido en Fases 1 y 2) y `04-api/contracts.md`/`04-api/errors.md` para el contrato detallado.

**Servicios de aplicación.**
- *Servicio de ingesta y cache*: implementa el patrón de cacheo bajo demanda contra MusicBrainz y Cover Art Archive (ver Fase 2 del roadmap). Es la única capa que habla con las APIs externas — el resto del sistema solo consulta la base propia.
- *Servicio de auth*: login, sesión, y en el futuro OAuth con proveedores de streaming para la función de actividad social.
- *Servicio de ratings/comentarios*: aplica las reglas de negocio de `01-domain/business-rules.md` antes de escribir en la base.

**Base de datos (PostgreSQL).** Fuente de verdad del catálogo curado y de los datos generados por usuarios. Las reglas de coherencia más críticas (estrellas/detallada, unicidad por usuario y objetivo) están reforzadas con constraints a nivel de base, no solo en la capa de aplicación — ver `03-data/sql-model.md`.

**Servicios externos.** MusicBrainz (metadata), Cover Art Archive (carátulas), y más adelante las APIs de Spotify/Apple Music para resolver "qué está escuchando" un usuario en tiempo real.

## Comunicación entre capas

Todas las llamadas a servicios externos pasan exclusivamente por el servicio de ingesta/cache — ningún otro componente del sistema llama directo a MusicBrainz o Cover Art Archive. Esto centraliza el cumplimiento del rate limit (1 request/segundo) y del `User-Agent` identificable que exige MusicBrainz, y facilita migrar a un espejo auto-hospedado de la base si el proyecto llega a necesitar uso comercial de la API (ver `03-data/data-licensing.md`).

## Escalabilidad

El catálogo no se precarga: crece con el uso real vía el patrón de cacheo bajo demanda. Esto evita tener que replicar de entrada una base de millones de artistas/álbumes/canciones, y mantiene el costo de infraestructura proporcional a la adopción real del producto.

## Autenticación

Se define en detalle en `02-architecture/adr/` y se documentará en profundidad en un `auth.md` dedicado cuando se implemente en la Fase 4. Por ahora: autenticación de usuario propia (email/username + contraseña), con espacio para sumar OAuth de proveedores de streaming más adelante, sin que eso requiera cambios estructurales en el modelo de `Usuario`.
