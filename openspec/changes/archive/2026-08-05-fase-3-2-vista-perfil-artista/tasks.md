## 1. Página y manejo de datos

- [x] 1.1 Crear `src/app/[locale]/(catalog)/artist/[id]/page.tsx` como Server Component con `params: Promise<{ id: string }>`.
- [x] 1.2 Obtener el artista y su discografía mediante `getArtistById` y `findOrIngestDiscography`, reutilizando el enriquecimiento existente para artistas stub.
- [x] 1.3 Convertir `ARTIST_NOT_FOUND` en `notFound()` y preservar el manejo uniforme de errores para fallos no recuperables.

## 2. Componentes del perfil

- [x] 2.1 Crear `src/components/catalog/ArtistHeader.tsx` con nombre, tipo traducido, biografía opcional, foto opcional y fallback visual.
- [x] 2.2 Crear `src/components/catalog/AlbumGrid.tsx` para agrupar `releaseGroups` en el orden de categorías definido por la especificación.
- [x] 2.3 Crear `src/components/catalog/AlbumCard.tsx` con título, categoría contextual y navegación locale-aware mediante `Link` de `src/i18n/navigation.ts`, preparada para `/album/[id]`.
- [x] 2.4 Crear `src/components/catalog/LazyCoverImage.tsx` como Client Component con TanStack Query, skeleton accesible, carátula devuelta por el backend y fallback ante ausencia o error.
- [x] 2.5 Componer la página con estados visuales coherentes para datos opcionales y categorías sin contenido, sin hardcodear textos de interfaz.
- [x] 2.6 Consumir `src/services/catalog/*` únicamente desde Server Components y utilizar `src/lib/api/catalog.ts` junto con TanStack Query para las consultas realizadas desde `LazyCoverImage`, respetando la separación definida por la arquitectura.

## 3. Internacionalización y configuración visual

- [x] 3.1 Agregar el grupo de mensajes `artist` dentro del namespace `catalog` en `messages/es/catalog.json`, con etiquetas de tipo, categorías, estados y textos accesibles.
- [x] 3.2 Agregar el mismo grupo de mensajes `artist` a `messages/en/catalog.json` y verificar consistencia entre locales.
- [x] 3.3 Configurar `images.remotePatterns` de `next/image` para permitir los dominios remotos utilizados por las carátulas devueltas por el backend, únicamente si la configuración actual aún no los contempla.

## 4. Pruebas

- [x] 4.1 Agregar pruebas para render de artista válido en ambos locales, incluyendo tipo y categorías traducidas.
- [x] 4.2 Agregar pruebas para artista sin foto ni biografía, categorías vacías y títulos musicales sin traducir.
- [x] 4.3 Agregar pruebas para artista inexistente y conversión del código `ARTIST_NOT_FOUND` a 404.
- [x] 4.4 Agregar pruebas de `LazyCoverImage` para carga, carátula disponible, carátula ausente y fallo recuperable sin bloquear las demás tarjetas.

## 5. Validación y documentación

- [x] 5.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, corrigiendo únicamente problemas introducidos por este change.
- [x] 5.2 Validar manualmente `/es/artist/<id>` y `/en/artist/<id>` utilizando Pink Floyd, Roger Waters, un artista inexistente y un artista stub, verificando tanto perfiles ya sincronizados como enriquecimiento automático. (Pink Floyd es/en, 404 e inexistente validados contra el dev server; enriquecimiento de stub vía `smoke-test-artist-by-id.ts`.)
- [x] 5.3 Verificar que no aparecen errores de consola, que las carátulas cargan progresivamente y que ningún texto nuevo queda fuera de `messages/`.
- [x] 5.4 Actualizar `docs/02-architecture/frontend-plan/02-implementation-plan.md`, `docs/02-architecture/frontend-plan/README.md`, `docs/README.md`.
- [x] 5.5 Marcar la Etapa 3.2 como completa solo después de cumplir todos los criterios de aceptación y archivar el change OpenSpec. (Listo para `/opsx-archive`; QA y Revisor aprobaron.)
