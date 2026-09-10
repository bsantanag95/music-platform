## 1. Autorización y consultas

- [x] 1.1 Implementar una consulta server-side de permisos efectivos para construir navegación sin persistir roles en cookie.
- [x] 1.2 Implementar consultas paginadas de reportes con filtros por estado y tipo de objetivo.
- [x] 1.3 Implementar consultas de restricciones sociales activas e historial mínimo necesario para moderación.
- [x] 1.4 Implementar consultas de listas editoriales distinguendo publicadas, retiradas y ocultas por moderación.

## 2. API de moderación

- [x] 2.1 Crear endpoint protegido para listar reportes con validación Zod y paginación.
- [x] 2.2 Crear endpoints protegidos para ocultar/restaurar comentarios, reseñas y listas con motivo obligatorio.
- [x] 2.3 Crear endpoints protegidos para crear y revocar restricciones `social_activity`.
- [x] 2.4 Aplicar `with-error-handling`, códigos localizados y autorización backend a todos los endpoints.
- [x] 2.5 Añadir pruebas de `401`, `403`, validación, auditoría y acciones exitosas de los endpoints.

## 3. API y superficie editorial

- [x] 3.1 Crear endpoint protegido para listar listas editoriales administrables.
- [x] 3.2 Crear endpoints protegidos para publicar y retirar listas oficiales.
- [x] 3.3 Validar que moderadores y usuarios normales no puedan publicar contenido editorial.
- [x] 3.4 Añadir pruebas de publicación, retirada, contenido moderado y permisos editoriales.

## 4. Navegación y rutas protegidas

- [x] 4.1 Añadir resolución server-side de capacidades para navegación localizada.
- [x] 4.2 Añadir enlaces de moderación y administración fuera de `OwnerHubPanel`, visibles solo con permisos.
- [x] 4.3 Crear rutas localizadas `/[locale]/moderation` y `/[locale]/admin` con protección server-side.
- [x] 4.4 Verificar que la revocación de un rol elimina el acceso en la siguiente solicitud.

## 5. Consola de moderación

- [x] 5.1 Implementar la cola de reportes con estados vacíos, carga, error y paginación.
- [x] 5.2 Implementar detalle de objetivo y acciones de ocultar/restaurar con confirmación y motivo.
- [x] 5.3 Implementar gestión de suspensión social con expiración, estado y revocación.
- [x] 5.4 Añadir actualización de la cola después de acciones sin perder el contexto de filtros.
- [x] 5.5 Añadir pruebas de componentes para permisos, estados y acciones de moderación.

## 6. Consola administrativa editorial

- [x] 6.1 Implementar listado administrativo de listas editoriales con estado de publicación y moderación.
- [x] 6.2 Implementar publicación y retirada con confirmación y feedback localizado.
- [x] 6.3 Mostrar correctamente estados vacíos, errores y listas ocultas por moderación.
- [x] 6.4 Añadir pruebas de componentes para administrador, moderador y usuario sin permisos.

## 7. Documentación y localización

- [x] 7.1 Añadir mensajes en español e inglés para navegación, estados, acciones y errores.
- [x] 7.2 Actualizar contratos API y códigos de error documentados.
- [x] 7.3 Actualizar documentación de arquitectura frontend y auth sobre las superficies protegidas.
- [x] 7.4 Documentar que la asignación/revocación de roles sigue siendo interna y sin UI.

## 8. Verificación

- [x] 8.1 Ejecutar `pnpm run typecheck`.
- [x] 8.2 Ejecutar `pnpm run lint`.
- [x] 8.3 Ejecutar `pnpm run test`.
- [x] 8.4 Ejecutar `pnpm run build`.
- [x] 8.5 Verificar manualmente con usuario normal, moderator y admin en desktop y móvil.
