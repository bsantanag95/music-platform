## 1. Preparación y modelo de datos

- [x] 1.1 Revisar `docs/05-features/phase-5-design.md`, `proposal.md`, `design.md` y las tres specs antes de tocar código.
- [x] 1.2 Definir los tipos compartidos para visibilidad de perfil, estado de seguimiento y bloqueo sin duplicarlos entre servicios, API y frontend.
- [x] 1.3 Crear una migración SQL nueva que agregue `profile_visibility` a `app_user` con default público y cree `user_follow` y `user_block`.
- [x] 1.4 Añadir a las tablas nuevas las PK UUID, FKs con borrado en cascada, unicidades, checks contra auto-relación e índices necesarios.
- [x] 1.5 Reflejar manualmente la migración en `src/db/schema.ts` y exportar los tipos de fila usados por la aplicación.
- [x] 1.6 Actualizar `docs/01-domain/domain-model.md` y `docs/03-data/sql-model.md` con perfil, seguimiento, solicitudes y bloqueo.

## 2. Servicios de perfiles y privacidad

- [x] 2.1 Implementar la lectura de perfil por username o identificador público sin exponer email, password hash, tokens ni datos internos.
- [x] 2.2 Implementar búsqueda paginada de usuarios por username o nombre visible, incluyendo perfiles públicos y privados.
- [x] 2.3 Implementar lectura y actualización autenticada de `profile_visibility` con actor derivado de la sesión.
- [x] 2.4 Aplicar las reglas de visibilidad para distinguir visitante, propietario y seguidor aprobado.
- [x] 2.5 Añadir tests de servicio para perfiles públicos, perfiles privados, búsqueda, configuración y ausencia de sesión.

## 3. Servicios de seguimiento

- [x] 3.1 Implementar seguimiento inmediato de perfiles públicos y creación idempotente de solicitudes para perfiles privados.
- [x] 3.2 Implementar aprobar, rechazar y cancelar solicitudes con autorización basada en propietario o solicitante.
- [x] 3.3 Implementar dejar de seguir y eliminar un seguidor propio sin recrear relaciones implícitamente.
- [x] 3.4 Implementar consulta paginada de seguidores, seguidos y solicitudes recibidas/enviadas.
- [x] 3.5 Resolver carreras y conflictos de unicidad de relaciones sin producir estados duplicados.
- [x] 3.6 Añadir tests de servicio para todos los estados de seguimiento, auto-seguimiento, idempotencia y permisos.

## 4. Servicios de bloqueo

- [x] 4.1 Implementar creación y eliminación de bloqueos con rechazo de auto-bloqueo.
- [x] 4.2 Eliminar en una única transacción las relaciones y solicitudes entre ambas cuentas al crear un bloqueo.
- [x] 4.3 Impedir seguimiento, aprobación y consulta de listados sociales restringidos mientras exista un bloqueo.
- [x] 4.4 Añadir tests de bloqueo, desbloqueo, permisos y aislamiento entre cuentas bloqueadas.

## 5. API y contratos

- [x] 5.1 Definir schemas Zod de perfiles, búsqueda, visibilidad, relaciones, solicitudes y bloqueos.
- [x] 5.2 Crear endpoints REST para perfil propio, perfil por username y búsqueda de usuarios.
- [x] 5.3 Crear endpoints REST para seguir, dejar de seguir, aprobar, rechazar, cancelar y gestionar relaciones.
- [x] 5.4 Crear endpoints REST para bloquear, desbloquear y consultar bloqueos propios.
- [x] 5.5 Definir y registrar códigos de error estables para username inválido, relación inválida, solicitud inexistente, bloqueo y permisos.
- [x] 5.6 Envolver todos los route handlers con `withErrorHandling` y derivar siempre el usuario desde la sesión server-side.
- [x] 5.7 Actualizar `docs/04-api/contracts.md` y `docs/04-api/errors.md` con los endpoints y códigos nuevos.
- [x] 5.8 Añadir tests de route handlers para autenticación, autorización, privacidad, idempotencia, paginación y errores.

## 6. Frontend y experiencia de usuario

- [x] 6.1 Crear páginas localizadas de búsqueda de usuarios, perfil propio, perfil ajeno y configuración de privacidad.
- [x] 6.2 Crear componentes reutilizables para estado de seguimiento, solicitudes, visibilidad y bloqueo.
- [x] 6.3 Integrar en búsqueda y perfiles los estados `Seguir`, `Solicitud enviada`, `Siguiendo`, aprobar, rechazar y dejar de seguir.
- [x] 6.4 Integrar gestión de seguidores, seguidos y solicitudes recibidas.
- [x] 6.5 Integrar bloqueo y desbloqueo con confirmaciones y estados de error localizados.
- [x] 6.6 Extender el header y el menú autenticado sin saturar la navegación móvil.
- [x] 6.7 Añadir estados de carga, vacío, error, éxito, foco, teclado, responsive y nombres accesibles.
- [x] 6.8 Añadir mensajes `es`/`en` y resolver errores mediante `ApiError.code`, sin mostrar mensajes crudos.
- [x] 6.9 Añadir tests de componentes, accesibilidad, locales y actualización optimista o refetch controlado de relaciones.

## 7. Validación e integración

- [x] 7.1 Ejecutar la migración y los smoke tests contra una base scratch, verificando que no se modifican datos de producción. Se creó `scripts/smoke-test-social.ts`; la ejecución con `ALLOW_SMOKE_ON_REAL_DB=1` pasó todos los casos y limpió sus fixtures.
- [x] 7.2 Validar manualmente perfil público, perfil privado, búsqueda, solicitud, aprobación, rechazo, dejar de seguir y bloqueo.
- [x] 7.3 Validar manualmente los flujos en español e inglés, móvil y escritorio, incluyendo sesión expirada y errores de permisos.
- [x] 7.4 Verificar que perfiles privados no exponen actividades ni listados sociales restringidos.
- [x] 7.5 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [x] 7.6 Revisar y actualizar la documentación activa de Fase 5 con cualquier comportamiento descubierto durante la validación.
