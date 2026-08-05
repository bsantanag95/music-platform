## Context

La Etapa 3.0 dejó disponible `searchCatalog()` como cliente tipado de la API, `ApiError` con códigos estables y los componentes UI base. La aplicación raíz todavía es el placeholder de la Fase 1. Esta etapa agrega la primera interacción visible del catálogo, sobre Next.js App Router, sin cambios en backend ni en el modelo de datos.

## Goals / Non-Goals

**Goals:**

- Exponer `/buscar` como página pública de búsqueda de artistas.
- Permitir que un envío válido invoque `searchCatalog()` y navegue al perfil encontrado.
- Representar carga, vacío, validación y error usando componentes y mensajes propios del frontend.
- Mantener accesibilidad básica: label asociado, foco visible y feedback anunciable.
- Cubrir el comportamiento con pruebas de componente y conservar la raíz como entrada al buscador.

**Non-Goals:**

- No implementar el perfil `/artista/[id]`, la discografía ni el detalle de álbum.
- No crear endpoints ni modificar contratos REST.
- No agregar autenticación, ratings, comentarios, estado global nuevo ni debounce.
- No llamar directamente a MusicBrainz ni construir URLs de carátulas.

## Decisions

- **Componente cliente solo para la interacción.** `SearchForm` usará estado local para el texto, estado de envío y error; la página podrá renderizarlo dentro de la ruta `/buscar`. Esto evita introducir estado global para una etapa pública de solo lectura.
- **Cliente API existente.** La búsqueda pasará por `searchCatalog()` y, por tanto, por `apiFetch()` y los schemas zod existentes. Se descarta `fetch` directo desde el componente para preservar validación runtime y manejo uniforme de errores.
- **Navegación con App Router.** Tras una respuesta válida se usará el router del cliente para ir a `/artista/${artist.id}`. Se descarta redirigir por nombre porque el contrato entrega el UUID propio y la navegación directa por id ya es la convención del catálogo. La vista de perfil de artista pertenece a una etapa posterior; durante esta etapa la navegación puede terminar en el fallback 404 de Next.js, lo cual es comportamiento esperado y no representa un fallo del flujo de búsqueda.
- **Errores mapeados por código.** `ARTIST_NOT_FOUND` se tratará como estado vacío; `INTERNAL_ERROR` y fallos no reconocidos mostrarán un error recuperable. El texto `ApiError.message` no se mostrará directamente.
- **Carga contextual.** Mientras se ejecuta la ingesta o búsqueda se deshabilitará el envío y se mostrará un mensaje que explique que la primera importación puede tardar, en lugar de un spinner genérico.

## Risks / Trade-offs

- [La primera búsqueda puede tardar por el rate limit de MusicBrainz] -> Mostrar estado de carga contextual y evitar solicitudes simultáneas desde el formulario.
- [Un usuario puede enviar espacios o repetir el envío] -> Recortar y validar el valor antes de invocar el cliente; deshabilitar el botón mientras está pendiente.
- [El contrato puede devolver una respuesta inesperada] -> Reutilizar `apiFetch()` y convertirlo en un estado de error genérico con reintento.
- [La página raíz y `/buscar` pueden divergir visualmente] -> Hacer que ambas usen el mismo `SearchForm` y los tokens/componentes UI ya definidos.

## Migration Plan

1. Crear la ruta y el formulario sin modificar la API.
2. Actualizar la página raíz para apuntar al buscador.
3. Ejecutar tests, typecheck, lint y build.
4. Validar manualmente el flujo con un artista cacheado y uno no existente.

No hay migración de datos ni rollback especial: retirar la ruta y restaurar el placeholder revierte el cambio de frontend.

## Open Questions

- Ninguna
