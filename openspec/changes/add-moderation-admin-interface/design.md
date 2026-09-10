## Context

La migración y los servicios de roles, permisos, reportes, moderación, restricciones sociales y
listas editoriales ya existen. Sin embargo, la aplicación solo expone el reporte de contenido y no
tiene una superficie web para que un moderador revise la cola o para que un administrador publique
contenido editorial. `OwnerHubPanel` representa la gestión personal del usuario y no debe convertirse
en un panel administrativo.

El cambio cruza App Router, route handlers, servicios de consultas, autorización, i18n y componentes
interactivos. La asignación y revocación de roles seguirá siendo una operación interna del servidor.

## Goals / Non-Goals

**Goals:**

- Crear superficies localizadas y separadas para moderación y administración editorial.
- Resolver permisos en el servidor para proteger páginas, datos y mutaciones.
- Exponer contratos REST para listar reportes y ejecutar las acciones ya soportadas por los servicios.
- Mantener cargas iniciales en Server Components y reservar Client Components para formularios y
  acciones interactivas.
- Hacer visibles los estados de reporte, moderación, suspensión y publicación con mensajes localizados.

**Non-Goals:**

- Crear una UI para conceder o revocar roles.
- Cambiar el modelo de roles o permisos; la asignación y revocación de roles sigue siendo interna.
- Moderar o editar entidades del catálogo de MusicBrainz.
- Añadir dependencias nuevas.

**Ajuste de esquema (migración `0023`):** la migración `0022` dejó el `CHECK` de
`moderation_action.action` sin las acciones `suspend_social`/`revoke_social` que el servicio ya
insertaba (la suspensión social habría violado el `CHECK`). Se extiende ese `CHECK` y se agrega
`user_list.official_withdrawn_at` para distinguir una lista editorial retirada de una lista personal
que nunca fue oficial. Esto altera el esquema, a diferencia de lo previsto originalmente.

## Decisions

### Superficies separadas por responsabilidad

Se crearán rutas bajo `src/app/[locale]/moderation` para moderadores y bajo
`src/app/[locale]/admin` para administración editorial. No se añadirán esos destinos a
`OwnerHubPanel`; la navegación personal y la administrativa tienen audiencias y controles distintos.

Alternativa descartada: añadir tarjetas condicionales al panel personal. Mezcla responsabilidades y
facilita que un futuro cambio de permisos exponga controles administrativos en una superficie de
usuario.

### Autorización server-side como fuente de verdad

Las páginas resolverán el usuario de sesión y usarán permisos efectivos en el servidor antes de
renderizar datos sensibles. Cada route handler repetirá `requirePermission`, aunque el enlace o la
página ya estén ocultos. El cliente solo controla affordances, no autorización.

Alternativa descartada: enviar roles en la sesión/cookie o confiar en el menú. Contradice el modelo
existente y permitiría bypass mediante llamadas HTTP directas.

### API REST mínima y uniforme

Se añadirán endpoints bajo `/api/moderation` para reportes, acciones sobre contenido y restricciones,
y bajo `/api/admin/editorial` para publicación editorial. Las entradas se validarán con los esquemas
Zod existentes o nuevos; las respuestas y errores seguirán `with-error-handling` y `ApiError.code`.

Las consultas de la cola devolverán solo los campos necesarios para la revisión, con paginación y
filtros explícitos. Las mutaciones conservarán los servicios de dominio existentes para no duplicar
transacciones ni auditoría.

### Carga inicial y mutaciones interactivas

Las páginas cargarán la primera vista como Server Components. Los formularios de motivo, filtros y
acciones sin navegación completa serán Client Components y usarán `src/lib/api/client.ts`; no se hará
`fetch` directo desde componentes. TanStack Query se usará únicamente si la cola requiere refetch o
actualización progresiva después de una acción.

### Estado de reportes

La cola distinguirá reportes pendientes, resueltos y descartados, y mostrará el contenido objetivo y
su historial de moderación. Ocultar/restaurar contenido y suspender/revocar restricciones serán
acciones separadas, cada una con motivo y confirmación para evitar decisiones accidentales.

### Alcance editorial: solo la cuenta curadora

La superficie administrativa y los endpoints de publicación/retirada operan **únicamente** sobre las
listas de la cuenta curadora de `/explore` (`@exploracion`, ver `docs/05-features/explore.md`). Las
listas personales de otros usuarios no aparecen en la consola editorial y rechazan publicación como
contenido oficial. Esto mantiene la separación entre contenido editorial y listas de usuarios; un
sistema futuro de generación de listas generales con más participantes reemplazará esta regla, pero
hoy la curaduría vive en esa cuenta.

### Asignación de roles interna

No habrá pantalla ni endpoint público para conceder o revocar roles. `grantRole` y `revokeRole`
seguirán siendo invocados por operaciones internas autorizadas. El panel podrá mostrar el permiso
efectivo del usuario actual, pero no editarlo.

## Risks / Trade-offs

- **[Riesgo]** La cola puede mostrar contenido que cambió desde su carga inicial → **Mitigación:**
  validar estado actual dentro de la mutación y devolver el registro actualizado o un error de
  conflicto claro.
- **[Riesgo]** Ocultar acciones en UI puede confundirse con autorización → **Mitigación:** repetir
  guards backend y cubrir llamadas directas con tests de `403`.
- **[Riesgo]** Las listas editoriales requieren distinguir origen oficial y estado de moderación →
  **Mitigación:** reutilizar `isOfficial`, `moderationStatus` y servicios existentes, sin duplicar
  columnas ni reglas.
- **[Riesgo]** La cola administrativa puede filtrar datos sensibles → **Mitigación:** seleccionar
  campos mínimos, exigir permisos antes de consultar y no incluir credenciales ni datos privados.

## Migration Plan

1. Añadir servicios de consulta y route handlers.
2. Añadir la migración `0023` (extender `CHECK` de `moderation_action` y agregar
   `user_list.official_withdrawn_at`) y sincronizar `schema.ts` y `docs/03-data/sql-model.md`.
3. Añadir páginas, navegación localizada y mensajes.
4. Activar la superficie para usuarios con permisos ya asignados; los usuarios normales no verán
   enlaces ni podrán acceder por URL.
5. Ejecutar typecheck, lint, tests y build; validar manualmente con usuarios moderator, admin y normal.

Rollback: retirar las rutas y enlaces nuevos. La migración `0023` es aditiva (extiende un `CHECK` y
agrega una columna nullable), por lo que revertir el cambio de código no requiere revertirla.

## Open Questions

- ¿La cola debe permitir resolver/descartar reportes explícitamente en esta primera versión o basta
  con que las acciones de moderación actualicen el estado implícitamente?
- ¿La revisión debe paginar por cursor o es suficiente paginación por página para el volumen inicial?
