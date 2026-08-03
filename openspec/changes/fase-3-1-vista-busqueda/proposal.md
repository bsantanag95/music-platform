## Why

La Fase 3 ya tiene el backend de catálogo y las fundaciones del frontend listas, pero la aplicación todavía muestra el placeholder de la Fase 1. La búsqueda pública es el punto de entrada necesario para validar el flujo de catálogo desde la UI y permitir que un usuario llegue al perfil de un artista sin escribir una URL manualmente.

## What Changes

- Crear la página pública `/buscar` para buscar artistas por nombre.
- Crear un formulario de búsqueda controlado con validación de entrada vacía.
- Mostrar estados explícitos de carga, resultado inexistente y error recuperable.
- Redirigir al perfil `/artista/[id]` cuando la búsqueda encuentra un artista.
- Reemplazar el placeholder de `src/app/page.tsx` por un landing con acceso al buscador.
- Agregar pruebas de componente para los estados principales del formulario.

## Capabilities

### New Capabilities

- `catalog-search`: Búsqueda pública de artistas, estados de interfaz y navegación al perfil del artista encontrado.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend Next.js App Router: `src/app/page.tsx`, `src/app/(catalog)/buscar/page.tsx` y `src/components/catalog/SearchForm.tsx`.
- Consumo del cliente existente `searchCatalog()` y manejo tipado de `ApiError.code`.
- Pruebas Vitest/Testing Library del flujo de búsqueda.
- No cambia la API, el esquema SQL, la ingesta ni las dependencias externas.
