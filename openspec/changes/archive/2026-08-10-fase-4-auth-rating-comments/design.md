## Context

El catálogo público de la Fase 3 ya consulta directamente los servicios de catálogo desde Server
Components y expone route handlers REST para lecturas. La Fase 4 agrega el primer estado mutable
del producto: usuarios autenticados, ratings y comentarios. El esquema inicial ya contiene
`app_user`, `rating` y `comment`, pero no contiene todavía `password_hash`, `session` ni
`auth_identity`, y la grabación aún no tiene vista propia.

El cambio cruza base de datos, servicios, API y frontend. Debe respetar ADR 0008 para sesiones y
Argon2id, ADR 0009 para borrado físico, y ADR 0010 para preparar identidades externas sin activar
Google todavía.

## Goals / Non-Goals

**Goals:**

- Implementar autenticación local completa con sesión server-side.
- Proteger mutaciones usando exclusivamente el usuario resuelto desde la sesión.
- Añadir detalle navegable de grabación y completar membresías.
- Implementar ratings duales y comentarios reutilizables en los tres objetivos.
- Dejar `auth_identity` y los adaptadores preparados para Google posterior.

**Non-Goals:**

- Ejecutar OAuth/OIDC de Google en este cambio.
- Añadir diario de escucha, favoritos, listas, feed o scrobbling.
- Recuperación de contraseña, verificación de email o moderación avanzada.

## Decisions

### Persistencia y sesiones

- Crear una migración SQL nueva con `app_user.password_hash`, `session` y `auth_identity`.
- Mantener el token de sesión opaco y solo persistir su hash.
- Usar expiración fija, sesiones múltiples, rotación tras autenticación y eventos sensibles, y no
  rotación por request normal.
- Revocar individualmente eliminando una sesión y revocar globalmente eliminando todas las
  sesiones del usuario.
- Ejecutar limpieza periódica y limpieza oportunista no bloqueante.

Se mantiene `password_hash` nullable y `auth_identity` con unicidad `(provider,
provider_account_id)`, índice por `user_id` y `ON DELETE CASCADE` hacia `app_user`. La implementación
local no necesita una columna `revoked_at`.

### Autenticación y autorización

- El servicio común vive en `src/services/auth/`.
- Los route handlers viven en `src/app/api/auth/`.
- Server Components consultan la sesión directamente; no hacen fetch a un endpoint propio.
- El rate limit de login y registro es en memoria, coherente con el supuesto de una instancia.
- Las mutaciones de rating y comentario reciben el objetivo y los valores, pero nunca `user_id`.
- Los endpoints devuelven errores machine-readable mediante `ApiError.code`.

### Catálogo y grabaciones

- Crear un read-model de grabación reutilizable por página y endpoint.
- Resolver créditos, apariciones en tracks y datos sociales desde la base propia después de la
  ingesta existente.
- Extender el read-model de artista para consultar membresías sin sustituir su discografía propia.
- Las llamadas externas de datos musicales siguen pasando solo por ingesta/cache; OAuth/OIDC no
  está sujeto a esa frontera porque no se implementa aquí.

### Ratings y comentarios

- Reutilizar un servicio de objetivos polimórficos para artista, `release_group` y recording.
- Delegar la coherencia estrellas/detallada y la unicidad de rating a los CHECK e índices SQL.
- Usar upsert para el rating vigente.
- Usar inserción múltiple para comentarios y DELETE físico para borrar el comentario propio.
- La edición de comentarios se implementa si el contrato de Fase 4 la incluye; el borrado físico
  no implica historial ni recuperación.

### Frontend

- Mantener Server Components para carga inicial y Client Components solo para formularios,
  selector de estrellas y mutaciones.
- Centralizar textos en `messages/es` y `messages/en`.
- Reutilizar los componentes de estado y el cliente API existente.
- Mostrar las acciones de escritura solo con sesión, y dirigir al login a usuarios anónimos.

## Risks / Trade-offs

- [Argon2id requiere módulo nativo] → validar instalación, typecheck y build en el entorno de CI;
  no cambiar el algoritmo sin reabrir ADR 0008.
- [Rate limiting en memoria no coordina múltiples instancias] → documentar la limitación y no
  presentar Fase 4 como preparada para despliegue horizontal.
- [Logout por eliminación física dificulta auditoría] → el producto no requiere historial de
  sesiones ahora; una necesidad futura será un cambio de seguridad separado.
- [Objetivos polimórficos pueden producir errores de target inválido] → validar exactamente un
  target en Zod, servicio y constraints de base.
- [La UI social introduce estados autenticados en páginas públicas] → probar explícitamente sesión
  ausente, sesión expirada, permisos ajenos y errores de constraint.
- [Google queda para un cambio posterior] → conservar `auth_identity` y la interfaz de proveedores
  sin exponer rutas OAuth incompletas en Fase 4.

## Migration Plan

1. Aplicar la nueva migración SQL en una base de desarrollo/scratch.
2. Desplegar servicios de autenticación y lecturas sin activar mutaciones hasta validar sesiones.
3. Activar registro/login local y luego ratings/comentarios.
4. Ejecutar backfill de membresías solo si la fuente de datos existente lo requiere; no eliminar
   datos de catálogo.
5. La reversión de aplicación puede desactivar las rutas nuevas; la reversión de esquema requiere
   una migración explícita posterior, nunca editar la migración aplicada.

## Open Questions

- Parámetros concretos de Argon2id y TTL fijo de sesión deben definirse durante la implementación
  y validarse con el entorno de despliegue.
- Debe confirmarse el contrato exacto de edición de comentarios antes de exponer PATCH.
- Los códigos finales de error de autenticación y sociales deben sincronizarse con `errors.md` y
  los schemas Zod.
