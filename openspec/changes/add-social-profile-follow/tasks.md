## 1. Preparación y modelo de datos

- [ ] 1.1 Revisar `docs/05-features/phase-5-design.md`, `proposal.md`, `design.md` y las tres specs antes de tocar código.
- [ ] 1.2 Definir los tipos compartidos para visibilidad de perfil, estado de seguimiento y bloqueo sin duplicarlos entre servicios, API y frontend.
- [ ] 1.3 Crear una migración SQL nueva que agregue `profile_visibility` a `app_user` con default público y cree `user_follow` y `user_block`.
- [ ] 1.4 Añadir a las tablas nuevas las PK UUID, FKs con borrado en cascada, unicidades, checks contra auto-relación e índices necesarios.
- [ ] 1.5 Reflejar manualmente la migración en `src/db/schema.ts` y exportar los tipos de fila usados por la aplicación.
- [ ] 1.6 Actualizar `docs/01-domain/domain-model.md` y `docs/03-data/sql-model.md` con perfil, seguimiento, solicitudes y bloqueo.

## 2. Servicios de perfiles y privacidad

- [ ] 2.1 Implementar la lectura de perfil por username o identificador público sin exponer email, password hash, tokens ni datos internos.
- [ ] 2.2 Implementar búsqueda paginada de usuarios por username o nombre visible, incluyendo perfiles públicos y privados.
- [ ] 2.3 Implementar lectura y actualización autenticada de `profile_visibility` con actor derivado de la sesión.
- [ ] 2.4 Aplicar las reglas de visibilidad para distinguir visitante, propietario y seguidor aprobado.
- [ ] 2.5 Añadir tests de servicio para perfiles públicos, perfiles privados, búsqueda, configuración y ausencia de sesión.

## 3. Servicios de seguimiento

- [ ] 3.1 Implementar seguimiento inmediato de perfiles públicos y creación idempotente de solicitudes para perfiles privados.
- [ ] 3.2 Implementar aprobar, rechazar y cancelar solicitudes con autorización basada en propietario o solicitante.
- [ ] 3.3 Implementar dejar de seguir y eliminar un seguidor propio sin recrear relaciones implícitamente.
- [ ] 3.4 Implementar consulta paginada de seguidores, seguidos y solicitudes recibidas/enviadas.
- [ ] 3.5 Resolver carreras y conflictos de unicidad de relaciones sin producir estados duplicados.
- [ ] 3.6 Añadir tests de servicio para todos los estados de seguimiento, auto-seguimiento, idempotencia y permisos.

## 4. Servicios de bloqueo

- [ ] 4.1 Implementar creación y eliminación de bloqueos con rechazo de auto-bloqueo.
- [ ] 4.2 Eliminar en una única transacción las relaciones y solicitudes entre ambas cuentas al crear un bloqueo.
- [ ] 4.3 Impedir seguimiento, aprobación y consulta de listados sociales restringidos mientras exista un bloqueo.
- [ ] 4.4 Añadir tests de bloqueo, desbloqueo, permisos y aislamiento entre cuentas bloqueadas.

## 5. API y contratos

- [ ] 5.1 Definir schemas Zod de perfiles, búsqueda, visibilidad, relaciones, solicitudes y bloqueos.
- [ ] 5.2 Crear endpoints REST para perfil propio, perfil por username y búsqueda de usuarios.
- [ ] 5.3 Crear endpoints REST para seguir, dejar de seguir, aprobar, rechazar, cancelar y gestionar relaciones.
- [ ] 5.4 Crear endpoints REST para bloquear, desbloquear y consultar bloqueos propios.
- [ ] 5.5 Definir y registrar códigos de error estables para username inválido, relación inválida, solicitud inexistente, bloqueo y permisos.
- [ ] 5.6 Envolver todos los route handlers con `withErrorHandling` y derivar siempre el usuario desde la sesión server-side.
- [ ] 5.7 Actualizar `docs/04-api/contracts.md` y `docs/04-api/errors.md` con los endpoints y códigos nuevos.
- [ ] 5.8 Añadir tests de route handlers para autenticación, autorización, privacidad, idempotencia, paginación y errores.

## 6. Frontend y experiencia de usuario

- [ ] 6.1 Crear páginas localizadas de búsqueda de usuarios, perfil propio, perfil ajeno y configuración de privacidad.
- [ ] 6.2 Crear componentes reutilizables para estado de seguimiento, solicitudes, visibilidad y bloqueo.
- [ ] 6.3 Integrar en búsqueda y perfiles los estados `Seguir`, `Solicitud enviada`, `Siguiendo`, aprobar, rechazar y dejar de seguir.
- [ ] 6.4 Integrar gestión de seguidores, seguidos y solicitudes recibidas.
- [ ] 6.5 Integrar bloqueo y desbloqueo con confirmaciones y estados de error localizados.
- [ ] 6.6 Extender el header y el menú autenticado sin saturar la navegación móvil.
- [ ] 6.7 Añadir estados de carga, vacío, error, éxito, foco, teclado, responsive y nombres accesibles.
- [ ] 6.8 Añadir mensajes `es`/`en` y resolver errores mediante `ApiError.code`, sin mostrar mensajes crudos.
- [ ] 6.9 Añadir tests de componentes, accesibilidad, locales y actualización optimista o refetch controlado de relaciones.

## 7. Validación e integración

- [ ] 7.1 Ejecutar la migración y los smoke tests contra una base scratch, verificando que no se modifican datos de producción.
- [ ] 7.2 Validar manualmente perfil público, perfil privado, búsqueda, solicitud, aprobación, rechazo, dejar de seguir y bloqueo.
- [ ] 7.3 Validar manualmente los flujos en español e inglés, móvil y escritorio, incluyendo sesión expirada y errores de permisos.
- [ ] 7.4 Verificar que perfiles privados no exponen actividades ni listados sociales restringidos.
- [ ] 7.5 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [ ] 7.6 Revisar y actualizar la documentación activa de Fase 5 con cualquier comportamiento descubierto durante la validación.
