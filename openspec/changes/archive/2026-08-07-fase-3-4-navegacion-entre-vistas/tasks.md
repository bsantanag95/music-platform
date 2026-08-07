## 1. Read-model y contratos internos

- [x] 1.1 Extender los tipos `AlbumDetail` para representar el artista principal opcional del `release_group`.
- [x] 1.2 Consultar en `getAlbumDetail` el crédito primario de nivel álbum y devolver el artista mínimo necesario para navegación.
- [x] 1.3 Mantener el shape público de `GET /api/catalog/release-group/[id]` y cubrir álbum con y sin artista principal.
- [x] 1.4 Mantener el artista principal como dato interno del read-model sin propagarlo a componentes o contratos que no lo requieran.

## 2. Navegación de catálogo

- [x] 2.1 Implementar el componente `Breadcrumbs` con enlaces desde la navegación locale-aware y etiquetas recibidas por locale.
- [x] 2.2 Añadir breadcrumbs a las páginas de inicio, artista y álbum, ocultando únicamente los segmentos cuyo contexto no exista.
- [x] 2.3 Convertir los créditos `featured` de `TrackList` en enlaces hacia `/artist/[artist.id]`, conservando `joinPhrase` y el renderizado localizado.
- [x] 2.4 Verificar que `AlbumCard` mantiene el enlace locale-aware hacia `/album/[id]` y corregir cualquier comentario o contrato obsoleto de la Etapa 3.3.

## 3. Encabezado y cambio de locale

- [x] 3.1 Implementar `src/components/layout/Header.tsx` con acceso global al buscador y selector `es`/`en`.
- [x] 3.2 Integrar `Header` en `src/app/[locale]/layout.tsx` sin convertir el layout en Client Component innecesariamente.
- [x] 3.3 Implementar el cambio de idioma preservando pathname, ids y parámetros mediante `src/i18n/navigation.ts`.
- [x] 3.4 Añadir y sincronizar las claves de `common` necesarias en `messages/es` y `messages/en`.

## 4. Pruebas

- [x] 4.1 Añadir tests del read-model para artista principal presente, ausente y shape REST sin regresiones.
- [x] 4.2 Añadir tests de `TrackList` para enlaces de créditos featured, locale y ausencia de créditos.
- [x] 4.3 Añadir tests de `Breadcrumbs` y `Header` para rutas, etiquetas y cambio de locale.
- [x] 4.4 Añadir o actualizar tests de las páginas de artista y álbum para breadcrumbs completos y parciales.
- [x] 4.5 Verificar que el cambio de locale conserva rutas dinámicas como /artist/[id] y /album/[id].

## 5. Documentación y validación

- [x] 5.1 Actualizar `docs/02-architecture/frontend-plan/02-implementation-plan.md` con el estado y resultado de la Etapa 3.4.
- [x] 5.2 Actualizar `docs/02-architecture/code-walkthrough.md` y la documentación de navegación si cambia el flujo descrito.
- [x] 5.3 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [x] 5.4 Ejecutar la validación manual del flujo Pink Floyd / Roger Waters en `/es` y `/en`, comprobando ausencia de enlaces rotos.
