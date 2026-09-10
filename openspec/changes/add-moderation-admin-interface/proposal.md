## Why

La plataforma ya persiste roles, permisos, reportes, restricciones sociales y acciones de moderación, pero esas capacidades todavía no tienen una superficie web operativa. Moderadores y administradores no pueden revisar reportes ni ejecutar las acciones autorizadas desde la interfaz, y los usuarios no reciben una navegación coherente con sus permisos.

Este cambio conecta la autorización existente con una experiencia web separada de la navegación personal, manteniendo la asignación y revocación de roles como operaciones internas del servidor.

## Goals

- Proporcionar una superficie de moderación para revisar reportes y actuar sobre contenido social.
- Proporcionar una superficie administrativa para gestionar contenido editorial oficial.
- Mostrar enlaces y acciones según permisos efectivos, sin usar la interfaz como única barrera de seguridad.
- Exponer los endpoints REST necesarios con autorización backend, validación y errores localizados.
- Mantener `OwnerHubPanel` como navegación personal del propietario.

## Non-Goals

- Crear una UI para asignar o revocar roles.
- Permitir autoasignación de roles o modificación de roles desde el cliente.
- Cambiar el modelo de roles, permisos o restricciones ya implementado.
- Crear una consola para editar el catálogo de MusicBrainz.

## What Changes

- Añadir navegación y rutas localizadas separadas para moderación y administración.
- Añadir una cola de reportes con filtros por estado y tipo de contenido.
- Añadir acciones de ocultar/restaurar comentarios, reseñas y listas, con motivo obligatorio.
- Añadir gestión operativa de suspensiones sociales, incluida la revocación.
- Añadir publicación y retirada de listas editoriales oficiales para administradores.
- Añadir endpoints para las operaciones que actualmente solo están disponibles como servicios internos.
- Añadir resolución server-side de permisos para proteger páginas, acciones y datos sensibles.
- Añadir mensajes localizados, estados vacíos, errores y pruebas de accesibilidad/responsive.

## Capabilities

### New Capabilities

- `moderation-console`: cola de reportes y acciones reversibles sobre contenido social.
- `admin-editorial-console`: gestión de listas editoriales oficiales y su visibilidad.
- `permission-aware-navigation`: navegación y superficies protegidas por permisos efectivos.

### Modified Capabilities

- `content-moderation`: hacer accesibles mediante API y UI las operaciones de revisión, ocultación, restauración y suspensión ya definidas.
- `official-editorial-content`: añadir las superficies administrativas y los contratos necesarios para publicar y retirar contenido oficial.

## Impact

- Frontend: nuevas rutas bajo `src/app/[locale]`, componentes de moderación/administración, navegación y mensajes localizados.
- Backend: nuevos route handlers bajo `src/app/api/moderation` y `src/app/api/admin`, con `requirePermission` y manejo uniforme de errores.
- Servicios: consultas de reportes, restricciones y listas editoriales para alimentar las pantallas.
- Contratos y documentación: actualización de `docs/04-api/contracts.md`, `docs/04-api/errors.md` y documentación de arquitectura/frontend.
- Tests: pruebas de autorización, route handlers, componentes, estados vacíos, errores y responsive.
- No se añaden dependencias nuevas previstas.
