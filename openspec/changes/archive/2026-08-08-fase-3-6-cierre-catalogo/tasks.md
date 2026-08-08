## 1. Mensajes y contratos internos de UI

- [x] 1.1 Auditar los namespaces `catalog`, `common` y `errors` en `messages/es` y `messages/en` y definir las claves faltantes para carga, error, not-found, reintento, fallback y accesibilidad.
- [x] 1.2 Sincronizar las claves nuevas en ambos locales y comprobar que no se traducen nombres, títulos ni otros datos musicales.
- [x] 1.3 Revisar las props de `Skeleton`, `ErrorState`, `EmptyState` y `DiscPlaceholder` para que todos los textos visibles y accesibles lleguen desde el componente de dominio.

## 2. Boundaries y estados de carga

- [x] 2.1 Implementar `src/app/[locale]/error.tsx` con mensaje localizado, acción de reintento y sin exposición del error crudo.
- [x] 2.2 Implementar `src/app/[locale]/not-found.tsx` con mensaje localizado y navegación de retorno al catálogo.
- [x] 2.3 Añadir `loading.tsx` a las rutas públicas de búsqueda, artista y álbum con skeletons representativos y localizados.
- [x] 2.4 Revisar los estados vacíos y errores de búsqueda, artista y álbum para que distingan recurso inexistente, ausencia válida y error recuperable.

## 3. Resiliencia de carátulas

- [x] 3.1 Ajustar `LazyCoverImage` para limitar a dos los reintentos de la consulta cover-only, aplicar backoff de aproximadamente 250 ms y 750 ms y cancelar temporizadores al desmontar o cambiar de álbum.
- [x] 3.2 Añadir manejo de error de carga del componente `next/image` con como máximo dos reintentos visuales y fallback definitivo a `DiscPlaceholder`.
- [x] 3.3 Mantener skeleton/placeholder accesible durante los reintentos y asegurar que un fallo de imagen no modifica el estado de la tarjeta ni rompe su enlace.
- [x] 3.4 Revisar `AlbumCover` y la vista de álbum para conservar el tracklist y la navegación cuando la imagen no exista o falle.
- [x] 3.5 Verificar que las URLs de carátula siguen siendo miniaturas centralizadas y que `next.config.mjs` permite únicamente los hostnames realmente necesarios.

## 4. Responsive y accesibilidad

- [x] 4.1 Auditar y ajustar el layout global, `Header` y `Breadcrumbs` para evitar overflow horizontal y mantener controles utilizables en móvil.
- [x] 4.2 Ajustar `ArtistHeader`, `AlbumGrid`, `AlbumCard` y estados de catálogo para tamaños móviles sin texto cortado ni pérdida de navegación.
- [x] 4.3 Ajustar `TrackList` y la cabecera del álbum para que tracks, duraciones y créditos permanezcan legibles en viewport móvil.
- [x] 4.4 Verificar labels asociados, textos alternativos, roles ARIA, `aria-current`, foco visible y contraste básico en ambos locales.

## 5. Pruebas

- [x] 5.1 Añadir tests de boundaries y estados `loading`, `not-found` y error con mensajes de `es` y `en`.
- [x] 5.2 Añadir tests de `LazyCoverImage` para éxito, error de consulta, reintentos limitados, error de imagen, cleanup y fallback definitivo.
- [x] 5.3 Añadir o actualizar tests de `AlbumCover`, `AlbumCard`, `AlbumGrid` y `TrackList` para verificar que los fallos parciales no rompen la navegación ni el contenido.
- [x] 5.4 Añadir tests de accesibilidad básica y revisar que los componentes UI no introduzcan traducciones hardcodeadas.

## 6. Documentación y validación final

- [x] 6.1 Actualizar `docs/02-architecture/frontend-plan/02-implementation-plan.md` con el resultado y estado de la Etapa 3.6.
- [x] 6.2 Actualizar `docs/02-architecture/frontend-plan/04-risks.md` y `docs/02-architecture/code-walkthrough.md` si los estados o la política de carátulas cambian respecto de lo documentado.
- [x] 6.3 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build` sin warnings nuevos de `next/image`.
- [x] 6.4 Validar manualmente búsqueda, artista, álbum, errores, not-found, cambio de locale y carátulas en `es` y `en`, con viewport móvil y escritorio.
- [x] 6.5 Validar manualmente el flujo Pink Floyd / Roger Waters y confirmar que no hay overflow, enlaces rotos ni loops de requests de carátulas.
