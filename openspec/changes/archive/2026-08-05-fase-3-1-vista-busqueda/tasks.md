## 1. Formulario y ruta

- [x] 1.1 Crear `src/components/catalog/SearchForm.tsx` como componente cliente con input controlado, normalización de espacios, validación local y submit deshabilitado durante la solicitud.
- [x] 1.2 Implementar en `SearchForm` la llamada a `searchCatalog()`, la navegación a `/artista/<id>` y el mapeo de `ApiError.code` a estados `EmptyState`/`ErrorState` sin mostrar mensajes crudos del backend. La ruta `/artista/[id]` será implementada en una etapa posterior; durante esta etapa, una navegación exitosa puede terminar temporalmente en el fallback 404 de Next.js, lo cual debe considerarse comportamiento esperado.
- [x] 1.3 Crear `src/app/(catalog)/buscar/page.tsx` con la composición de la vista pública, título, contexto de carga y feedback accesible.
- [x] 1.4 Actualizar `src/app/page.tsx` para reemplazar el placeholder de Fase 1 por el landing con acceso al buscador reutilizando `SearchForm`.

## 2. Pruebas

- [x] 2.1 Agregar pruebas de componente para búsqueda válida, normalización de entrada y navegación al artista encontrado verificando únicamente que se construye correctamente la ruta `/artista/<id>`.
- [x] 2.2 Agregar pruebas para input vacío sin request, estado `ARTIST_NOT_FOUND` y error recuperable con reintento.
- [x] 2.3 Verificar labels, relaciones ARIA, estado disabled durante carga y ausencia de requests duplicados.

## 3. Validación y documentación

- [x] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, corrigiendo únicamente problemas introducidos por este cambio.
- [x] 3.2 Ejecutar validación manual del flujo `Pink Floyd`, búsqueda inexistente, input vacío y fallo recuperable sin errores de consola. La navegación posterior a un artista encontrado puede mostrar el 404 estándar de Next.js mientras `/artista/[id]` permanezca fuera del alcance de esta etapa.
- [x] 3.3 Marcar la Etapa 3.1 como completa en `docs/02-architecture/frontend-plan/02-implementation-plan.md` solo después de cumplir todos sus criterios de aceptación y actualizar documentos afectados si surge una convención nueva.
