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

- _Servicio de ingesta y cache_: implementa el patrón de cacheo bajo demanda contra MusicBrainz y Cover Art Archive (ver Fase 2 del roadmap). Es la única capa que habla con las APIs externas de datos del catálogo — el resto del sistema solo consulta la base propia. Esta exclusividad no aplica al flujo OAuth/OIDC del servicio de autenticación.
- _Servicio de auth_: registro, login local, sesión, autorización e identidades externas. Vive en
  `src/services/auth/`; los adaptadores OAuth/OIDC viven en `src/services/auth/providers/` y sus
  route handlers en `src/app/api/auth/`. La autenticación local y el login/alta con Google OAuth/OIDC
  están implementados y desembocan en la misma sesión server-side. Los flujos OAuth/OIDC utilizan
  Authorization Code con state y PKCE, y nonce cuando se utiliza OIDC. El frontend no implementa el
  flujo OAuth/OIDC ni valida tokens del proveedor. El linking explícito y otros proveedores quedan
  diferidos; el scrobbling de servicios de streaming sigue siendo una función posterior de Fase 5.
- _Servicio de ratings/comentarios_: aplica las reglas de negocio de `01-domain/business-rules.md` antes de escribir en la base.

**Base de datos (PostgreSQL).** Fuente de verdad del catálogo curado y de los datos generados por usuarios. Las reglas de coherencia más críticas (estrellas/detallada, unicidad por usuario y objetivo) están reforzadas con constraints a nivel de base, no solo en la capa de aplicación — ver `03-data/sql-model.md`.

**Servicios externos.** MusicBrainz (metadata), Cover Art Archive (carátulas), y más adelante las APIs de Spotify/Apple Music para resolver "qué está escuchando" un usuario en tiempo real.

## Comunicación entre capas

Las llamadas externas de datos del catálogo pasan exclusivamente por el servicio de ingesta/cache — ningún otro componente del sistema llama directo a MusicBrainz o Cover Art Archive. Esta regla no aplica a las llamadas del flujo OAuth/OIDC, que pertenecen al servicio de autenticación y se realizan exclusivamente en el backend. La separación centraliza el cumplimiento del rate limit (1 request/segundo) y del `User-Agent` identificable que exige MusicBrainz, y facilita migrar a un espejo auto-hospedado de la base si el proyecto llega a necesitar uso comercial de la API (ver `03-data/data-licensing.md`).

## Escalabilidad

El catálogo no se precarga: crece con el uso real vía el patrón de cacheo bajo demanda. Esto evita tener que replicar de entrada una base de millones de artistas/álbumes/canciones, y mantiene el costo de infraestructura proporcional a la adopción real del producto.

## Autenticación

Se define en `auth.md`, ADR 0008 y ADR 0010. La autenticación local y la futura autenticación
OAuth/OIDC desembocan en la misma sesión server-side. `app_user.password_hash` es nullable y las
identidades externas se almacenan en `auth_identity`, sin columnas específicas por proveedor.
