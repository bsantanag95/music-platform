## 1. Preparación y dependencias

- [ ] 1.1 Revisar los artefactos de la propuesta junto con `docs/02-architecture/auth.md`, ADR 0008, ADR 0009 y ADR 0010 antes de tocar código.
- [ ] 1.2 Confirmar la dependencia de Argon2id, sus parámetros iniciales y compatibilidad con `pnpm install`, typecheck y build.
- [ ] 1.3 Definir los nuevos códigos de error y schemas Zod para auth, grabaciones, ratings, comentarios y permisos.

## 2. Persistencia de autenticación

- [ ] 2.1 Crear una migración SQL nueva para `app_user.password_hash`, `session` y `auth_identity`, sin modificar migraciones aplicadas.
- [ ] 2.2 Añadir constraints e índices para unicidad de identidad externa, sesiones por usuario y borrado en cascada de identidades.
- [ ] 2.3 Reflejar manualmente la migración en `src/db/schema.ts` y exportar los tipos necesarios.
- [ ] 2.4 Implementar limpieza periódica y oportunista de sesiones expiradas sin bloquear requests.
- [ ] 2.5 Validar la migración en una base de datos de scratch y cubrir expiración, sesiones múltiples, revocación individual y global.

## 3. Servicio de autenticación local

- [ ] 3.1 Crear `src/services/auth/` con hashing/verificación Argon2id y validación de credenciales.
- [ ] 3.2 Implementar creación, resolución, rotación y eliminación de sesiones con cookie `httpOnly`, `secure` y `sameSite=lax`.
- [ ] 3.3 Implementar rate limiting en memoria para registro y login por IP y/o identificador.
- [ ] 3.4 Implementar resolución de sesión reutilizable desde Server Components y route handlers, sin fetch interno.
- [ ] 3.5 Implementar autorización que derive siempre `user_id` de la sesión.
- [ ] 3.6 Crear `src/app/api/auth/register/route.ts` con validación, errores uniformes y creación de sesión.
- [ ] 3.7 Crear `src/app/api/auth/login/route.ts` con rate limiting, errores genéricos y rotación de sesión.
- [ ] 3.8 Crear `src/app/api/auth/logout/route.ts` y endpoint de revocación global de sesiones.
- [ ] 3.9 Crear `GET /api/auth/me` únicamente como contrato opcional para el cliente; los Server Components no deben depender de él.
- [ ] 3.10 Añadir tests de servicio y route handlers para éxito, credenciales inválidas, rate limit, expiración, rotación y revocación.

## 4. UI de autenticación

- [ ] 4.1 Crear páginas localizadas de registro e inicio de sesión bajo `src/app/[locale]/`.
- [ ] 4.2 Crear componentes de formulario con validación de UX, estados de carga, errores localizados y navegación locale-aware.
- [ ] 4.3 Integrar el estado de sesión en el header sin exponer tokens al cliente.
- [ ] 4.4 Añadir mensajes `es`/`en` y tests de accesibilidad y consistencia de claves.

## 5. Navegación de canción

- [ ] 5.1 Implementar el read-model de grabación con datos públicos, créditos y apariciones en tracks.
- [ ] 5.2 Crear `GET /api/catalog/recording/[id]` con validación UUID, errores uniformes y schema Zod.
- [ ] 5.3 Crear la página localizada `/{locale}/song/[id]` y sus estados loading, not-found y error.
- [ ] 5.4 Convertir los tracks del álbum en enlaces al detalle de grabación sin romper el tracklist ni los créditos.
- [ ] 5.5 Añadir tests del read-model, route handler, página, enlaces, locales y casos de grabación inexistente.

## 6. Navegación por membresías

- [ ] 6.1 Extender el servicio de artista para leer integrantes de grupos desde `membership`.
- [ ] 6.2 Combinar discografía propia y discografía de grupos para perfiles de personas, deduplicando álbumes.
- [ ] 6.3 Añadir UI localizada de integrantes, roles, períodos y enlaces a perfiles.
- [ ] 6.4 Verificar que la lectura no genere llamadas externas adicionales cuando los datos ya están cacheados.
- [ ] 6.5 Añadir tests del caso persona/grupo y smoke test Pink Floyd / Roger Waters en base scratch.

## 7. Servicios de ratings y comentarios

- [ ] 7.1 Crear resolución común de objetivos polimórficos para artista, `release_group` y recording.
- [ ] 7.2 Implementar lectura de rating propio y agregados públicos.
- [ ] 7.3 Implementar upsert de rating con validación de estrellas y detailed score, dejando la integridad crítica en SQL.
- [ ] 7.4 Implementar DELETE físico de rating propio y rechazo de ratings ajenos.
- [ ] 7.5 Implementar creación y listado paginado de comentarios.
- [ ] 7.6 Implementar edición según el contrato final y DELETE físico de comentarios propios.
- [ ] 7.7 Rechazar objetivos inválidos, usuarios anónimos y mutaciones con `user_id` manipulado.
- [ ] 7.8 Añadir tests de servicios, constraints, permisos, unicidad, coherencia dual y borrado físico.

## 8. API y contratos sociales

- [ ] 8.1 Crear route handlers REST para ratings y comentarios con `with-error-handling`.
- [ ] 8.2 Definir schemas de request/response en `src/lib/api/schemas.ts` y cliente API tipado.
- [ ] 8.3 Documentar endpoints, autenticación requerida, códigos de error y paginación en `docs/04-api/`.
- [ ] 8.4 Verificar que ningún contrato existente del catálogo cambie sin actualización documentada.

## 9. Integración frontend social

- [ ] 9.1 Crear componentes reutilizables de rating dual y comentarios para artista, álbum y canción.
- [ ] 9.2 Integrar lectura pública y mutaciones autenticadas en las tres vistas sin bloquear el contenido musical.
- [ ] 9.3 Mostrar login requerido a visitantes anónimos y estados localizados de éxito, error, vacío y borrado irreversible.
- [ ] 9.4 Añadir tests de componentes, permisos visuales, accesibilidad, locales y regresión del catálogo.

## 10. Preparación de proveedores externos

- [ ] 10.1 Crear la interfaz común y estructura de adaptadores bajo `src/services/auth/providers/` sin habilitar rutas OAuth.
- [ ] 10.2 Verificar que `auth_identity` permite almacenar identidades OIDC por `(provider, provider_account_id)` y que `password_hash` nullable funciona.
- [ ] 10.3 Documentar explícitamente que Google se implementará en un cambio posterior, sin incluir secretos ni callbacks incompletos en Fase 4.

## 11. Documentación y validación final

- [ ] 11.1 Actualizar `docs/02-architecture/code-walkthrough.md`, `docs/04-api/contracts.md` y `docs/04-api/errors.md` con el comportamiento implementado.
- [ ] 11.2 Actualizar `docs/03-data/sql-model.md` y cualquier documento de dominio si la migración concreta introduce diferencias.
- [ ] 11.3 Añadir smoke tests de autenticación, ratings, comentarios y grabaciones contra una base de scratch.
- [ ] 11.4 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [ ] 11.5 Revisar manualmente los flujos localizados, expiración de sesión, sesiones múltiples, revocación, permisos y responsive.
