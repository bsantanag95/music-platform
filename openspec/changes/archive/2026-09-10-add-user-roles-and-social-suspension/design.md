## Context

Hoy `app_user` no tiene roles y `requireUser()` solo distingue entre sesión válida y anónima.
Las mutaciones sociales resuelven al usuario desde la sesión, pero no existe una capa común para
permisos, moderación ni sanciones. El cambio cruza autenticación, datos sociales, reseñas, listas,
feed y contenido editorial, por lo que necesita una decisión técnica previa.

La suspensión solicitada no desactiva la cuenta: conserva lectura, acceso al perfil propio, diario
privado y colección, pero impide nuevas acciones que puedan producir contenido o actividad visible
para terceros. La asignación de roles será interna en la primera versión; no se construirá un panel
de administración de cuentas.

## Goals / Non-Goals

**Goals:**

- Implementar roles acumulables `user`, `moderator` y `admin`.
- Centralizar permisos y la comprobación de restricciones sociales en backend.
- Permitir moderación de comentarios/reseñas y sanciones temporales limitadas.
- Habilitar contenido editorial oficial administrado por `admin`.
- Mantener acceso personal y de lectura durante una suspensión.
- Conservar trazabilidad de acciones de moderación y asignaciones internas.

**Non-Goals:**

- Panel web para administrar usuarios o asignar roles.
- Edición humana del catálogo MusicBrainz.
- Suspensión total, borrado de cuenta o administración de credenciales por moderadores.
- Apelaciones, scoring automático o detección automática de abuso.

## Decisions

### 1. Roles acumulables mediante tabla de unión

Se añadirá `user_role` con unicidad `(user_id, role)`, en lugar de una columna única en
`app_user` o un array de roles. Esto permite asignar varios roles, agregar metadata de auditoría y
evitar migraciones de tipo cuando aparezcan roles nuevos. Los valores iniciales serán `moderator` y
`admin`; la ausencia de filas representa al usuario común.

Los roles se consultarán desde servicios de autorización y no se copiarán en la cookie ni en la
sesión persistida. Así, retirar un rol tiene efecto inmediato en requests posteriores.

**Alternativas descartadas:** una columna `role` (impide acumulación) y un array PostgreSQL
(dificulta constraints, auditoría y queries de permisos).

### 2. Permisos explícitos y no jerarquía implícita

El código comprobará permisos semánticos, por ejemplo `moderation.review_content`,
`moderation.suspend_social` y `editorial.publish`, derivados de los roles. `admin` tendrá los
permisos de moderación y editorial, pero las rutas no dependerán de comparaciones de strings como
`role === 'admin'` salvo para operaciones exclusivamente administrativas.

Esto permite que un futuro rol editorial no requiera reescribir todas las rutas.

### 3. Suspensión social como restricción temporal con alcance

Se añadirá una entidad de restricción con alcance `social_activity`, fecha de inicio, expiración,
motivo y actor responsable. La resolución será activa cuando `starts_at <= now()` y
`expires_at IS NULL OR expires_at > now()`.

La comprobación se aplicará en servicios de mutación, antes de escribir. La lectura no llamará a la
restricción salvo para filtrar contenido que ya haya sido moderado. La suspensión no ocultará ni
borrará automáticamente el contenido anterior.

Durante la suspensión se bloquearán comentarios, reseñas, creación/edición pública de ratings,
actividad compartible, seguimientos, guardados/interacciones sociales, listas `followers`/`public`,
publicación editorial propia y cambios de audiencia hacia una audiencia más amplia. Se permitirá
el borrado o privatización de contenido propio cuando la operación existente ya lo permita.

**Alternativa descartada:** una bandera `is_suspended` en `app_user`, porque no representa alcance,
vigencia, motivo ni historial y convertiría la cuenta en un estado global difícil de extender.

### 4. Moderación separada del borrado del autor

Los reportes y acciones de moderación conservarán actor, objetivo, acción, motivo y timestamps.
Ocultar contenido por moderación será reversible y no reutilizará el borrado físico del autor
definido por ADR 0009. Los listados públicos excluirán contenido oculto, mientras que el autor y
los moderadores podrán recibir el estado apropiado sin filtrar información a visitantes anónimos.

### 5. Contenido editorial reutiliza listas, con marca de plataforma

La primera superficie editorial reutilizará `user_list`/`user_list_featured`, pero añadirá una
marca de origen oficial y reglas de propiedad que impidan que una lista personal se convierta en
oficial mediante un campo controlable por el usuario. Solo `admin` podrá crear o publicar este
contenido en la primera versión.

No se introduce un rol `editor` todavía; se puede añadir cuando exista una necesidad operativa
real de separar publicación editorial de administración.

### 6. Navegación administrativa separada

`OwnerHubPanel` seguirá agrupando superficies personales (`/me/*`). Moderación y administración
usarán rutas y componentes propios, visibles solo a quienes tengan el permiso correspondiente.
Ocultar enlaces no sustituye la autorización backend.

### 7. Operaciones internas sin UI

La asignación/revocación de roles y la creación/revocación de suspensiones se expondrán primero como
servicios o scripts internos autenticados por el entorno operativo. Se documentarán sus precondiciones
y se probarán contra una base de datos de scratch. Una futura UI deberá reutilizar los mismos
servicios, no escribir tablas directamente desde componentes.

## Risks / Trade-offs

- **[Alguna mutación nueva olvida comprobar la suspensión]** → centralizar la guardia en servicios
  de autorización y mantener una matriz de endpoints con tests de regresión.
- **[La sesión conserva datos de roles obsoletos]** → no guardar roles en cookie ni sesión; resolverlos
  desde base de datos en cada autorización sensible.
- **[Una suspensión deja contenido previo visible]** → documentar que la suspensión bloquea actividad
  futura; el moderador debe ocultar contenido existente mediante una acción independiente.
- **[El alcance editorial se mezcla con listas personales]** → separar marca de origen oficial,
  permisos de publicación y consultas de descubrimiento.
- **[Moderadores abusan de acciones sobre usuarios]** → limitar operaciones a sanciones temporales,
  guardar actor/motivo/vigencia y excluir cambios de cuenta o de identidad.
- **[Cambios de audiencia permiten evadir la suspensión]** → bloquear explícitamente toda transición
  hacia `followers` o `public`, además de bloquear las operaciones de creación.

## Migration Plan

1. Aplicar migración aditiva para roles, restricciones, reportes, acciones y metadata editorial.
2. Desplegar servicios de lectura/autorización con usuarios existentes tratados como `user`.
3. Desplegar guards en endpoints existentes y nuevas rutas internas de moderación.
4. Desplegar consultas de contenido que excluyan estados moderados y reconozcan contenido oficial.
5. Verificar typecheck, lint, tests, build y smoke tests de autorización en una base scratch.

La reversión de código es segura mientras no se creen filas dependientes nuevas. La reversión de
datos no debe borrar auditoría ni restricciones; si fuera necesaria, se requiere una migración
compensatoria revisada, nunca editar una migración aplicada.

## Open Questions

- Definir los códigos machine-readable finales para rechazo por suspensión y por rol insuficiente.
- Confirmar si las valoraciones propias pueden borrarse durante suspensión; el diseño bloquea crear
  y editar porque afectan agregados, pero conserva como opción el borrado/privatización permitido por
  la superficie concreta.
