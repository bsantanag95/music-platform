## Why

La Fase 3 dejó un catálogo público navegable, pero el producto todavía no permite identificar
usuarios ni registrar opiniones. La Fase 4 debe cerrar el MVP con autenticación local, detalle de
canción, navegación por membresías y la capa social de ratings y comentarios, manteniendo Google
preparado para implementarse inmediatamente después en un cambio separado.

## Goals

- Implementar autenticación local con sesiones server-side seguras.
- Permitir valorar y comentar artistas, álbumes y canciones.
- Completar la navegación de canciones y membresías del catálogo.
- Mantener las reglas de integridad de ratings y comentarios en PostgreSQL.
- Dejar preparada la persistencia y la interfaz para proveedores OAuth/OIDC futuros.

## Non-Goals

- Implementar Google u otro proveedor OAuth/OIDC en este cambio.
- Implementar recuperación de contraseña por email.
- Implementar diario de escucha, favoritos, listas, feed o scrobbling.
- Implementar moderación avanzada o reporte de comentarios.

## What Changes

- Añadir persistencia de contraseña local, sesiones server-side y `auth_identity` preparada para proveedores externos.
- Implementar registro, login, logout, resolución de sesión y revocación individual/global.
- Aplicar expiración fija, rotación tras autenticación/eventos sensibles, sesiones múltiples y limpieza de sesiones.
- Crear el detalle de canción y su endpoint REST, con créditos, apariciones y datos sociales.
- Completar la navegación por membresías entre personas y grupos.
- Crear endpoints y UI para consultar, crear, editar y borrar ratings y comentarios.
- Mantener borrado físico de ratings y comentarios, sin `deleted_at`.
- Localizar las nuevas vistas y estados en español e inglés.
- Actualizar contratos API, errores, documentación y pruebas.

## Capabilities

### New Capabilities

- `local-auth`: registro, login, logout, sesiones server-side y autorización local.
- `song-detail`: consulta y vista navegable de una grabación.
- `ratings-and-comments`: valoración dual y comentarios sobre artista, álbum y canción.
- `artist-memberships`: navegación y composición de discografías mediante membresías.

### Modified Capabilities

- `catalog-artist`: incorporar integrantes de grupos y discografía por membresía.
- `catalog-album`: enlazar canciones hacia el detalle de grabación y conservar navegación social.

## Impact

- Base de datos: nueva migración para `password_hash`, `session` y `auth_identity`.
- Backend: `src/services/auth/`, servicios sociales y nuevos route handlers REST.
- Frontend: páginas localizadas de autenticación, canción, membresías, ratings y comentarios.
- API: nuevos contratos de autenticación, grabaciones y mutaciones sociales.
- Dependencias: posible dependencia nativa de Argon2id, sujeta a validación de build/deploy.
- Pruebas: unitarias, route handlers, componentes, autorización y smoke tests con base de datos de scratch.
