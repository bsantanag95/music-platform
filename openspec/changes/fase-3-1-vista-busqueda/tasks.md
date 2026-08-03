## 1. Formulario y ruta

- [ ] 1.1 Crear `src/components/catalog/SearchForm.tsx` como componente cliente con input controlado, normalización de espacios, validación local y submit deshabilitado durante la solicitud.
- [ ] 1.2 Implementar en `SearchForm` la llamada a `searchCatalog()`, la navegación a `/artista/<id>` y el mapeo de `ApiError.code` a estados `EmptyState`/`ErrorState` sin mostrar mensajes crudos del backend.
- [ ] 1.3 Crear `src/app/(catalog)/buscar/page.tsx` con la composición de la vista pública, título, contexto de carga y feedback accesible.
- [ ] 1.4 Actualizar `src/app/page.tsx` para reemplazar el placeholder de Fase 1 por el landing con acceso al buscador reutilizando `SearchForm`.

## 2. Pruebas

- [ ] 2.1 Agregar pruebas de componente para búsqueda válida, normalización de entrada y navegación al artista encontrado.
- [ ] 2.2 Agregar pruebas para input vacío sin request, estado `ARTIST_NOT_FOUND` y error recuperable con reintento.
- [ ] 2.3 Verificar labels, relaciones ARIA, estado disabled durante carga y ausencia de requests duplicados.

## 3. Validación y documentación

- [ ] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, corrigiendo únicamente problemas introducidos por este cambio.
- [ ] 3.2 Ejecutar validación manual del flujo `Pink Floyd`, búsqueda inexistente, input vacío y fallo recuperable sin errores de consola.
- [ ] 3.3 Marcar la Etapa 3.1 como completa en `docs/02-architecture/frontend-plan/02-implementation-plan.md` solo después de cumplir todos sus criterios de aceptación y actualizar documentos afectados si surge una convención nueva.
