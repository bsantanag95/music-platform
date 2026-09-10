# ADR 0012 — Roles de plataforma y suspensión social

## Estado

Aceptado

## Contexto

La plataforma necesita delegar moderación y publicar contenido editorial oficial sin convertir
la cuenta de un usuario sancionado en una cuenta inaccesible. Hasta ahora todas las cuentas
autenticadas tenían los mismos permisos y no existía una auditoría de acciones administrativas.

## Decisión

- Los roles de plataforma son acumulables y se persisten en `user_role`.
- Los roles iniciales son `moderator` y `admin`; la ausencia de filas representa a un usuario común.
- La autorización se expresa mediante permisos derivados de roles y se comprueba en backend.
- Una restricción `social_activity` bloquea nuevas acciones públicas/sociales, pero conserva login,
  lectura, perfil propio, diario privado y colección.
- La restricción tiene alcance, motivo, actor, inicio, expiración y revocación; no borra contenido
  previo automáticamente.
- La moderación oculta/restaura contenido de forma reversible y registra cada acción.
- La publicación editorial oficial requiere permiso de administración y se distingue de las listas
  personales.
- La asignación de roles y las sanciones se operan inicialmente mediante servicios internos, sin
  panel web de administración de cuentas.

## Alternativas descartadas

- Una columna única `role` en `app_user`, porque no permite varios roles.
- Un array de roles, porque dificulta constraints, auditoría y consultas.
- Una bandera `is_suspended`, porque no expresa alcance, vigencia, motivo ni historial.
- Reutilizar el borrado físico del autor para moderación, porque elimina evidencia y no permite
  restaurar contenido.

## Consecuencias

Las mutaciones sociales deben pasar por una guardia común de autorización. El catálogo de
MusicBrainz continúa siendo de solo lectura para la comunidad y no se introduce un rol editorial
separado hasta que exista una necesidad operativa real.
