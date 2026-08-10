## 1. Preparación y dependencias

- [x] 1.1 Revisar los artefactos de la propuesta junto con `docs/02-architecture/auth.md`, ADR 0008, ADR 0009 y ADR 0010 antes de tocar código.
- [x] 1.2 Confirmar la dependencia de Argon2id, sus parámetros iniciales y compatibilidad con `pnpm install`, typecheck y build.
- [x] 1.3 Definir los nuevos códigos de error y schemas Zod para auth, grabaciones, ratings, comentarios y permisos.

## 2. Persistencia de autenticación

- [x] 2.1 Crear una migración SQL nueva para `app_user.password_hash`, `session` y `auth_identity`, sin modificar migraciones aplicadas.
- [x] 2.2 Añadir constraints e índices para unicidad de identidad externa, sesiones por usuario y borrado en cascada de identidades.
- [x] 2.3 Reflejar manualmente la migración en `src/db/schema.ts` y exportar los tipos necesarios.
- [x] 2.4 Implementar limpieza periódica y oportunista de sesiones expiradas sin bloquear requests.
- [x] 2.5 Validar la migración en `music_platform_scratch` y cubrir expiración, sesiones múltiples, revocación individual y global. `drizzle/0005_auth.sql` quedó registrada en `_migrations`; `scripts/smoke-test-phase4.ts` verificó el ciclo de sesiones y limpió sus fixtures.

## 3. Servicio de autenticación local

- [x] 3.1 Crear `src/services/auth/` con hashing/verificación Argon2id y validación de credenciales.
- [x] 3.2 Implementar creación, resolución, rotación y eliminación de sesiones con cookie `httpOnly`, `secure` y `sameSite=lax`.
- [x] 3.3 Implementar rate limiting en memoria para registro y login por IP y/o identificador.
- [x] 3.4 Implementar resolución de sesión reutilizable desde Server Components y route handlers, sin fetch interno.
- [x] 3.5 Implementar autorización que derive siempre `user_id` de la sesión.
- [x] 3.6 Crear `src/app/api/auth/register/route.ts` con validación, errores uniformes y creación de sesión.
- [x] 3.7 Crear `src/app/api/auth/login/route.ts` con rate limiting, errores genéricos y rotación de sesión.
- [x] 3.8 Crear `src/app/api/auth/logout/route.ts` y endpoint de revocación global de sesiones.
- [x] 3.9 Crear `GET /api/auth/me` únicamente como contrato opcional para el cliente; los Server Components no deben depender de él.
- [x] 3.10 Añadir tests de servicio y route handlers para éxito, credenciales inválidas, rate limit, expiración, rotación y revocación.

## 4. UI de autenticación

- [x] 4.1 Crear páginas localizadas de registro e inicio de sesión bajo `src/app/[locale]/`.
- [x] 4.2 Crear componentes de formulario con validación de UX, estados de carga, errores localizados y navegación locale-aware.
- [x] 4.3 Integrar el estado de sesión en el header sin exponer tokens al cliente.
- [x] 4.4 Añadir mensajes `es`/`en` y tests de accesibilidad y consistencia de claves.

## 5. Navegación de canción

- [x] 5.1 Implementar el read-model de grabación con datos públicos, créditos y apariciones en tracks.
- [x] 5.2 Crear `GET /api/catalog/recording/[id]` con validación UUID, errores uniformes y schema Zod.
- [x] 5.3 Crear la página localizada `/{locale}/song/[id]` y sus estados loading, not-found y error.
- [x] 5.4 Convertir los tracks del álbum en enlaces al detalle de grabación sin romper el tracklist ni los créditos.
- [x] 5.5 Añadir tests del read-model, route handler, página, enlaces, locales y casos de grabación inexistente.

## 6. Navegación por membresías

- [x] 6.1 Extender el servicio de artista para leer integrantes de grupos desde `membership`.
- [x] 6.2 Combinar discografía propia y discografía de grupos para perfiles de personas, deduplicando álbumes.
- [x] 6.3 Añadir UI localizada de integrantes, roles, períodos y enlaces a perfiles.
- [x] 6.4 Verificar que la lectura no genere llamadas externas adicionales cuando los datos ya están cacheados.
- [x] 6.5 Añadir tests del caso persona/grupo y smoke test Pink Floyd / Roger Waters en base scratch. `smoke-test-ingestion.ts`, `smoke-test-new-endpoints.ts`, `smoke-test-routes.ts` y `smoke-test-phase4.ts` pasaron contra `music_platform_scratch`.

## 7. Servicios de ratings y comentarios

- [x] 7.1 Crear resolución común de objetivos polimórficos para artista, `release_group` y recording.
- [x] 7.2 Implementar lectura de rating propio y agregados públicos.
- [x] 7.3 Implementar upsert de rating con validación de estrellas y detailed score, dejando la integridad crítica en SQL.
- [x] 7.4 Implementar DELETE físico de rating propio y rechazo de ratings ajenos.
- [x] 7.5 Implementar creación y listado paginado de comentarios.
- [x] 7.6 Implementar edición según el contrato final y DELETE físico de comentarios propios.
- [x] 7.7 Rechazar objetivos inválidos, usuarios anónimos y mutaciones con `user_id` manipulado.
- [x] 7.8 Añadir tests de servicios, constraints, permisos, unicidad, coherencia dual y borrado físico.

## 8. API y contratos sociales

- [x] 8.1 Crear route handlers REST para ratings y comentarios con `with-error-handling`.
- [x] 8.2 Definir schemas de request/response en `src/lib/api/schemas.ts` y cliente API tipado.
- [x] 8.3 Documentar endpoints, autenticación requerida, códigos de error y paginación en `docs/04-api/`.
- [x] 8.4 Verificar que ningún contrato existente del catálogo cambie sin actualización documentada.

## 9. Integración frontend social

- [x] 9.1 Crear componentes reutilizables de rating dual y comentarios para artista, álbum y canción.
- [x] 9.2 Integrar lectura pública y mutaciones autenticadas en las tres vistas sin bloquear el contenido musical.
- [x] 9.3 Mostrar login requerido a visitantes anónimos y estados localizados de éxito, error, vacío y borrado irreversible.
- [x] 9.4 Añadir tests de componentes, permisos visuales, accesibilidad, locales y regresión del catálogo.

## 10. Preparación de proveedores externos

- [x] 10.1 Crear la interfaz común y estructura de adaptadores bajo `src/services/auth/providers/` sin habilitar rutas OAuth.
- [x] 10.2 Verificar que `auth_identity` permite almacenar identidades OIDC por `(provider, provider_account_id)` y que `password_hash` nullable funciona.
- [x] 10.3 Documentar explícitamente que Google se implementará en un cambio posterior, sin incluir secretos ni callbacks incompletos en Fase 4.

## 11. Documentación y validación final

- [x] 11.1 Actualizar `docs/02-architecture/code-walkthrough.md`, `docs/04-api/contracts.md` y `docs/04-api/errors.md` con el comportamiento implementado.
- [x] 11.2 Actualizar `docs/03-data/sql-model.md` y cualquier documento de dominio si la migración concreta introduce diferencias.
- [x] 11.3 Añadir smoke tests de autenticación, ratings, comentarios y grabaciones contra una base de scratch. `scripts/smoke-test-phase4.ts` pasó y limpió sus fixtures.
- [x] 11.4 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`. QA 2026-08-09: typecheck OK; lint OK (2 warnings, 0 errores); test OK (38 archivos, 160 tests); build OK.
- [ ] 11.5 Revisar manualmente los flujos localizados, expiración de sesión, sesiones múltiples, revocación, permisos y responsive.
