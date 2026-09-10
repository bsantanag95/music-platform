## 1. Decisiones y modelo de datos

- [x] 1.1 Crear ADR de autorización, roles acumulables, permisos, moderación y suspensión social.
- [x] 1.2 Crear migración SQL aditiva para `user_role`, restricciones sociales, reportes y auditoría.
- [x] 1.3 Añadir soporte de origen editorial oficial a las listas sin editar migraciones aplicadas.
- [x] 1.4 Sincronizar `src/db/schema.ts` y `docs/03-data/sql-model.md` con las nuevas tablas, checks e índices.

## 2. Autorización y restricciones

- [x] 2.1 Implementar resolución de roles y permisos desde base de datos, sin persistirlos en la cookie de sesión.
- [x] 2.2 Implementar guards para permisos de moderación, administración y publicación editorial.
- [x] 2.3 Implementar resolución de restricciones activas por alcance y expiración.
- [x] 2.4 Añadir códigos API localizados para permiso insuficiente y suspensión social activa.
- [x] 2.5 Crear pruebas unitarias de roles acumulables, revocación, expiración y ausencia de autoasignación.

## 3. Moderación

- [x] 3.1 Implementar creación idempotente de reportes sobre comentarios y reseñas.
- [x] 3.2 Implementar ocultación y restauración reversible con registro de actor, motivo y fecha.
- [x] 3.3 Implementar suspensión y revocación interna de `social_activity` con motivo y expiración.
- [x] 3.4 Implementar operaciones internas de asignación y revocación de roles con auditoría.
- [x] 3.5 Añadir pruebas de autorización que separen usuario, moderador y administrador.

## 4. Integración de suspensión social

- [x] 4.1 Aplicar la guardia de suspensión a comentarios y reseñas, incluyendo el rating asociado a una reseña.
- [x] 4.2 Aplicar la guardia a creación/edición de ratings que afecten superficies públicas.
- [x] 4.3 Aplicar la guardia a diario compartible, feed y demás eventos de actividad pública.
- [x] 4.4 Aplicar la guardia a seguimiento de usuarios, seguimiento de artistas, favoritos y otras interacciones sociales.
- [x] 4.5 Aplicar la guardia a creación/publicación de listas visibles y a ampliaciones de audiencia.
- [x] 4.6 Verificar que login, lectura pública, perfil propio, diario privado y colección siguen disponibles.
- [x] 4.7 Verificar que borrar o privatizar contenido propio conserva las reglas normales durante la suspensión.
- [x] 4.8 Añadir pruebas de regresión para cada mutación bloqueada y para una suspensión expirada o revocada.

## 5. Contenido editorial oficial

- [x] 5.1 Implementar el servicio interno de creación/publicación de listas editoriales para `admin`.
- [x] 5.2 Impedir que usuarios normales conviertan listas personales en contenido oficial.
- [x] 5.3 Actualizar consultas de descubrimiento para distinguir contenido oficial y excluir contenido moderado.
- [x] 5.4 Añadir pruebas de publicación, visibilidad, permisos y ocultación editorial.

## 6. Superficies y contratos

- [x] 6.1 Crear rutas/servicios separados para moderación y administración, sin reutilizar `OwnerHubPanel` como panel administrativo.
- [x] 6.2 Actualizar los contratos API y errores para reportes, moderación, restricciones y contenido oficial.
- [x] 6.3 Actualizar mensajes localizados para estados de suspensión, permisos y distintivos editoriales.
- [x] 6.4 Actualizar `domain-model.md`, `business-rules.md` y `auth.md` con las reglas definitivas.

## 7. Verificación

- [x] 7.1 Ejecutar `pnpm run typecheck`.
- [x] 7.2 Ejecutar `pnpm run lint`.
- [x] 7.3 Ejecutar `pnpm run test`.
- [x] 7.4 Ejecutar `pnpm run build`.
- [x] 7.5 Ejecutar los smoke tests relevantes contra una base de datos scratch y documentar el resultado.
