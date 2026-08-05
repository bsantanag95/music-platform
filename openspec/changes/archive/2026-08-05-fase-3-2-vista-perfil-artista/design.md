## Context

La Etapa 3.1 ya entrega búsqueda localizada y el backend dispone de `getArtistById` y `findOrIngestDiscography`. Falta una vista pública que consuma esos servicios, muestre la información del artista y presente sus `releaseGroups` con carátulas opcionales. La aplicación usa Next.js App Router, Server Components para la carga inicial y TanStack Query únicamente para datos obtenidos después del primer render.

## Goals / Non-Goals

**Goals:**

- Renderizar el perfil inicial desde el servidor, sin round-trip HTTP hacia la propia API.
- Enriquecer automáticamente artistas stub mediante el servicio existente.
- Separar la presentación del encabezado, la agrupación de álbumes, las tarjetas y la carga de carátulas.
- Mantener todos los textos de interfaz en los mensajes localizados.
- Preparar la navegación locale-aware hacia `/album/[id]` sin implementar todavía el detalle de álbum.

**Non-Goals:**

- Cambiar servicios de catálogo, endpoints, esquemas REST o base de datos.
- Resolver ediciones, tracklists o créditos del álbum.
- Crear un sistema global de estado o incorporar dependencias nuevas.

## Decisions

### Carga inicial directa desde Server Components

La página `artist/[id]/page.tsx` llamará directamente a `getArtistById` y `findOrIngestDiscography`. Esto evita una llamada HTTP redundante dentro del mismo proceso y conserva el patrón documentado para las páginas de catálogo. Como alternativa, podría consumir `/api/catalog/artist/[id]`, pero esa opción agrega latencia y duplica la frontera interna sin aportar valor para el render inicial.

### Separación entre servidor y cliente

Los Server Components consumirán directamente `src/services/catalog/*` para la carga inicial. Los Client Components accederán únicamente mediante `src/lib/api/catalog.ts` y TanStack Query. No se importarán servicios del backend desde componentes cliente, manteniendo la separación definida por la arquitectura del frontend.

### Manejo de inexistentes con `notFound()`

La página traducirá el código `ARTIST_NOT_FOUND` a `notFound()` para entregar el fallback 404 de Next.js. No se mostrará el mensaje crudo del backend. Los errores recuperables no previstos seguirán el boundary de error existente. Crear un boundary específico nuevo queda fuera de esta etapa salvo que la implementación lo requiera para cumplir el estado amigable.

### Carátulas progresivas en un Client Component

`LazyCoverImage` será el único componente cliente de esta vista. Recibirá el id del `releaseGroup`, consultará `getReleaseGroupDetail` mediante TanStack Query y mostrará `cover` si existe, usando un skeleton durante la carga y un fallback si no hay imagen.

Las carátulas se consumirán directamente desde las URLs proporcionadas por el backend utilizando `next/image`. La aplicación permitirá únicamente los dominios configurados mediante `remotePatterns` y no implementará un proxy propio mientras no exista una necesidad funcional o de rendimiento que lo justifique.

No se construirán URLs de Cover Art Archive manualmente ni se solicitará resolución completa. La alternativa de cargar todas las carátulas en el Server Component bloquearía el render y multiplicaría el tiempo de respuesta inicial.

### Agrupación y traducción en la presentación

`AlbumGrid` agrupará los `releaseGroups` por `category` en el orden fijo `studio`, `single_ep`, `compilation`, `live_other`. Las etiquetas de categorías, tipos de artista, estados y textos accesibles se resolverán mediante `useTranslations("catalog")` utilizando el grupo de mensajes `artist`. Los nombres de álbum, biografías y demás datos provenientes de MusicBrainz se mostrarán sin traducir.

### Navegación preparada para la siguiente etapa

`AlbumCard` usará el componente `Link` de `src/i18n/navigation.ts` con la ruta `/album/[id]`. El enlace quedará preparado para la implementación de la Etapa 3.3; la validación del flujo completo corresponde a la Etapa 3.4. No se usará `next/link` directo porque perdería el locale activo.

## Risks / Trade-offs

- [Muchas consultas de carátulas] → cada álbum puede disparar una consulta posterior y, si falta cache local, una ingesta externa; se mantiene carga bajo demanda y se limita a la miniatura existente.
- [Artista sin foto o biografía] → usar fallback visual y ocultar o presentar de forma neutra los campos nulos, sin bloquear el perfil.
- [Artista stub lento] → reutilizar el enriquecimiento existente y mostrar el estado de carga propio del render del servidor; no duplicar la consulta desde el cliente.
- [Cambios en contratos de API] → consumir tipos y validación existentes; si apareciera una modificación contractual, detener el alcance y actualizar `docs/04-api/` en el mismo cambio.
- [Proveedor de imágenes no disponible] → mostrar el fallback visual sin bloquear el resto de la página.

## Migration Plan

No hay migración de datos, esquema ni despliegue especial. La implementación agrega rutas y componentes, se valida con typecheck, lint, tests y build, y puede revertirse eliminando esos archivos sin afectar los endpoints existentes.
