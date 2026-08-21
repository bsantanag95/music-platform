## Context

La aplicación ya tiene `app_user`, autenticación local y Google OAuth, sesiones server-side y
ratings/comentarios sobre el catálogo. Todavía no existe una identidad social navegable: no hay
perfil de usuario, búsqueda de personas, seguimiento, solicitudes ni bloqueo.

La Fase 5 define una experiencia social basada en perfiles públicos o privados, seguimiento
unilateral y actividades con audiencia configurable. Este cambio implementa únicamente los
cimientos que otras entregas necesitarán; no implementa escuchas, listas, favoritos ni feed.

## Goals / Non-Goals

**Goals:**

- Persistir la visibilidad pública o privada del perfil.
- Exponer perfiles y búsqueda de usuarios sin revelar actividades futuras todavía.
- Implementar seguimiento unilateral con aprobación para perfiles privados.
- Implementar bloqueo básico como límite de interacción social.
- Mantener autorización server-side derivada de la sesión.
- Integrar las nuevas superficies con locales, estados accesibles y el shell autenticado existente.

**Non-Goals:**

- Persistir audiencia de escuchas, ratings, comentarios, favoritos o listas; cada capacidad futura
  definirá su propia columna o relación de audiencia.
- Diario de escucha, `listen_entry`, favoritos, listas o feed.
- Listas colaborativas, moderación, reportes o notificaciones push.
- Cambiar autenticación local, Google OAuth o linking de identidades.

## Decisions

### Visibilidad del perfil

Se agregará una configuración de visibilidad al usuario existente, con valores `public` y
`private`, protegida por un `CHECK`. El valor inicial será `public` para usuarios nuevos. Se
prefiere una columna en `app_user` frente a una tabla de preferencias porque es una propiedad
única, necesaria para resolver autorización de perfiles y seguimiento, y no requiere un sistema
genérico de settings todavía.

El perfil privado seguirá apareciendo en búsqueda con identidad mínima y acción de seguimiento,
pero no expondrá su contenido social. La decisión de hacer pública una actividad concreta en una
entrega futura podrá sobrescribir el valor predeterminado del perfil.

### Relaciones de seguimiento

Se usará una tabla `user_follow` con `follower_id`, `followed_id`, estado `pending` o `accepted` y
timestamps. La pareja será única y no se permitirá auto-seguimiento. Un perfil público crea
directamente una relación `accepted`; un perfil privado crea `pending`.

Se elige una tabla con estado frente a dos tablas separadas porque una solicitud y un seguimiento
aceptado son estados del mismo intento de relación. Rechazar elimina la solicitud; cancelar una
solicitud propia también la elimina. Dejar de seguir elimina una relación aceptada.

### Bloqueo

Se usará una tabla `user_block` con `blocker_id`, `blocked_id` y unicidad sobre la pareja. No se
permitirá auto-bloqueo. Crear un bloqueo eliminará las relaciones de seguimiento en ambas
direcciones y las solicitudes pendientes asociadas. Mientras exista el bloqueo, no se podrá buscar
el perfil bloqueado desde las acciones sociales, seguirlo, aprobar una solicitud ni consultar sus
listados sociales.

Se mantiene separado de `user_follow` porque bloqueo y seguimiento tienen semánticas distintas y
el índice de bloqueo debe ser fácil de consultar en cualquier autorización social.

### API y autorización

Las lecturas públicas de búsqueda y perfil no requieren sesión, salvo que la respuesta necesite
mostrar el estado de seguimiento del visitante. Las mutaciones requieren sesión y siempre derivan
el actor de la cookie server-side; ningún body acepta `user_id` como identidad operativa.

Se crearán route handlers REST bajo `/api/users` y `/api/me`, con schemas Zod y códigos estables.
Los errores de negocio se traducirán a `ApiError.code`; el frontend no mostrará mensajes crudos.

### Frontend y datos

La carga inicial de perfil y búsqueda se resolverá con Server Components cuando sea posible. Las
acciones de seguimiento, solicitudes y bloqueo usarán Client Components y TanStack Query para
actualizar el estado después de la interacción.

El header conservará la búsqueda global y añadirá el acceso al perfil y la navegación social en un
menú autenticado. En móvil no se añadirá una fila permanente con todas las opciones.

### Alternativas consideradas

- **Tabla genérica de preferencias:** descartada por introducir abstracción sin segundo uso
  concreto.
- **Seguir siempre de forma inmediata:** descartado porque no respeta el requisito de aprobación
  para perfiles privados.
- **Amistad mutua:** descartada porque el modelo de producto es seguimiento unilateral.
- **Bloqueo solo en aplicación:** descartado porque las restricciones deben imponerse también en
  servicios y consultas, no únicamente ocultarse en UI.

## Risks / Trade-offs

- **[Feed futuro sin grafo suficiente]** -> El cambio habilita seguimiento, pero no convierte la
  actividad en pública automáticamente; el feed se implementará después con reglas de audiencia.
- **[Perfil privado y actividad pública pueden confundirse]** -> La próxima especificación de
  actividades debe mostrar la audiencia antes de publicar y definir explícitamente el alcance de
  una actividad pública desde un perfil privado.
- **[Enumeración de usuarios]** -> La búsqueda devuelve solo identidad mínima, aplica paginación y
  no expone email ni datos de autenticación.
- **[Carreras entre solicitudes]** -> La unicidad en base de datos y operaciones idempotentes
  resolverán dos acciones concurrentes sobre la misma pareja.
- **[Bloqueos inconsistentes]** -> La creación de bloqueo y la eliminación de relaciones se harán
  en una transacción.
- **[Saturación del header]** -> La navegación social se agrupará en menú de cuenta y se probará
  en viewport móvil.
- **[Migración con usuarios existentes]** -> `profile_visibility` tendrá default `public`, sin
  modificar ni crear relaciones sociales existentes.

## Migration Plan

1. Aplicar una migración SQL nueva que agregue la visibilidad de perfil y cree `user_follow` y
   `user_block` con constraints, índices y timestamps.
2. Reflejar manualmente el esquema en `src/db/schema.ts` y actualizar `docs/03-data/sql-model.md`.
3. Desplegar servicios y endpoints detrás de la autenticación existente.
4. Desplegar las páginas y controles de UI.
5. Verificar contra una base scratch y ejecutar los gates completos.

La migración es compatible hacia adelante: los usuarios existentes quedan públicos y sin
relaciones. El rollback de aplicación consiste en retirar rutas y UI; el rollback de schema solo se
considerará antes de que existan datos sociales, porque eliminar relaciones creadas implicaría
pérdida de información. En producción se preferirá una migración compensatoria que deshabilite la
funcionalidad antes que borrar datos.

## Open Questions

- ¿Una actividad marcada como `public` por un perfil privado será visible para cualquier visitante
  o únicamente para seguidores aprobados? Se resolverá en la capacidad de actividades.
- ¿Se requiere notificación dentro de la aplicación para nuevas solicitudes desde esta primera
  entrega? El alcance actual solo exige que la solicitud aparezca en la gestión del perfil.
- ¿Bloquear debe ocultar al usuario de la búsqueda general o únicamente impedir acciones sociales?
  La implementación inicial debe impedir resultados accionables para el bloqueador y bloqueado;
  el alcance exacto de la búsqueda se confirmará en los tests de UX.
