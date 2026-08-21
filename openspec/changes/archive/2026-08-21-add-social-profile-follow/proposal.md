## Why

La Fase 5 necesita una base social explícita antes de implementar diario, listas y feed. Hoy la
aplicación tiene usuarios autenticados, pero no ofrece perfiles, descubrimiento de personas ni una
forma controlada de construir el círculo cuyo contenido alimentará la actividad social.

Este cambio establece esa base respetando las decisiones del diseño maestro: perfiles públicos o
privados, seguimiento unilateral, aprobación para perfiles privados, descubribilidad por nombre y
bloqueo básico desde la primera entrega social.

## Goals

- Permitir que una persona tenga un perfil público o privado configurable.
- Permitir buscar usuarios por nombre o username sin exponer información innecesaria.
- Implementar seguimiento unilateral y solicitudes para perfiles privados.
- Resolver los estados de seguimiento de forma clara en API y UI.
- Permitir bloquear usuarios y evitar interacciones sociales entre cuentas bloqueadas.
- Preparar la política de audiencia para futuras actividades, escuchas, ratings, comentarios,
  favoritos y listas.
- Ofrecer una experiencia localizada, responsive y accesible.

## Non-Goals

- Diario de escucha o entidad `listen_entry`.
- Favoritos, listas o feed de actividad.
- Scrobbling o integración con Spotify/Apple Music.
- Listas colaborativas.
- Moderación avanzada, reportes o sistema de denuncias.
- Vinculación de identidades OAuth.

## What Changes

- Añadir configuración de visibilidad de perfil público o privado.
- Añadir búsqueda de usuarios que muestre nombre/username y el estado de seguimiento.
- Añadir seguimiento unilateral entre usuarios.
- Añadir solicitudes de seguimiento para perfiles privados, con aprobación, rechazo y cancelación.
- Añadir gestión de seguidores y seguidos.
- Añadir bloqueo básico y sus reglas de autorización.
- Añadir páginas localizadas de perfil propio y de otros usuarios.
- Extender la navegación autenticada y el menú de cuenta sin saturar el header móvil.
- Añadir contratos REST, schemas Zod, códigos de error y mensajes localizados.
- Añadir migración SQL, espejo en `src/db/schema.ts`, servicios, route handlers y tests.
- Documentar las reglas de privacidad y seguimiento en `/docs`.

## Capabilities

### New Capabilities

- `social-profiles`: perfiles públicos o privados, búsqueda de usuarios y configuración de
  visibilidad.
- `user-following`: seguimiento unilateral, solicitudes, aprobación, rechazo y gestión de
  seguidores/seguidos.
- `social-blocking`: bloqueo básico y prevención de interacciones entre cuentas bloqueadas.

### Modified Capabilities

_(ninguna; las capacidades existentes de catálogo, autenticación local y Google OAuth no cambian
 sus requisitos funcionales)_

## Impact

- **Base de datos:** nuevas tablas o columnas para visibilidad de perfil, relaciones de seguimiento
  y bloqueos; migración SQL nueva y espejo manual en `src/db/schema.ts`.
- **Backend:** nuevos servicios de usuarios y relaciones sociales bajo `src/services/`.
- **API:** búsqueda de usuarios, perfiles, seguimiento, solicitudes y bloqueo bajo
  `src/app/api/`, con errores uniformes y autorización derivada de la sesión.
- **Frontend:** nuevas páginas localizadas de perfil, búsqueda de usuarios, solicitudes y listas
  de seguidores; extensión del header y menú autenticado.
- **Mensajes:** nuevas claves en `messages/es` y `messages/en`.
- **Documentación:** contratos API, errores, modelo de dominio, modelo SQL y diseño maestro de
  Fase 5.
- **Pruebas:** servicios, constraints, autorización, route handlers, componentes, accesibilidad,
  locales y smoke test contra una base scratch.
