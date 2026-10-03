## 1. Servicios de lectura de géneros

- [x] 1.1 `genreHref(slug)` en `src/lib/catalog-links.ts` con test
- [x] 1.2 `src/services/genres/display.ts`: `getArtistGenres`, `getAlbumGenres` (efectivos + descriptores) y `getSongGenres` (del álbum principal), con `inherited`, ocultos excluidos y tests
- [x] 1.3 `src/services/genres/page.ts`: `getGenrePage(slug)` con familias, padres, subgéneros, cercanos (fusión de e influido por, hasta 8 sin repetir), artistas (hasta 12 por álbumes acreditados, desempate por nombre) y tests; slug inválido → `null`
- [x] 1.4 Verificar las consultas de `getGenrePage` contra scratch (subárbol grande como "rock", tiempo razonable, índices existentes)

## 2. Componentes y páginas de catálogo

- [x] 2.1 Componente de servidor `GenreChips` (hasta 5 + "+N" con `<details>`, herencia atenuada con texto accesible "Heredado de {artista}", fila de descriptores sin enlace) con tests
- [x] 2.2 Mensajes es/en: etiquetas de herencia, "+N", descriptores, página de género y estado vacío (`catalog.genres`)
- [x] 2.3 Cabecera de artista: chips de sus géneros semilla; omitir la zona sin géneros; test
- [x] 2.4 Identidad de álbum: chips efectivos + descriptores, con herencia marcada; test
- [x] 2.5 Identidad de canción: chips del disco principal (heredados del álbum); test
- [x] 2.6 Página `/{locale}/genre/[slug]` (`await params`, 404 para slug inexistente o no estilo, redirección 308 a minúsculas), metadatos, secciones relacionadas, artistas y álbumes paginados con `listAlbumsByGenre`; test de página

## 3. Búsqueda y selector de géneros

- [x] 3.1 `searchGenres(query, locale)` en `src/services/genres/search.ts` (`search_normalize`, orden exacta/prefijo/resto/uso/nombre, máximo 20, sugerencias iniciales de 12) con tests
- [x] 3.2 `GET /api/genres/search` público con `withErrorHandling`, validación Zod y esquema de respuesta en `schemas.ts`; test de la ruta
- [x] 3.3 Validación de identidad contra la taxonomía: `UpdateMusicIdentityRequestSchema` valida formato de slug y `updateMusicIdentity` verifica que sean estilos visibles (400 sin cambios); `GENRES` queda como sugerencias; actualizar tests
- [x] 3.4 `identityGenreLabels` omite los slugs ocultos o retirados en lugar de caer al slug; tests
- [x] 3.5 Componente cliente `GenreMultiSelect` (debounce 200 ms con TanStack Query y `apiFetch`, listbox accesible con teclado, chips quitables, contador "n de 5", tope 5) y su uso en `OwnerMusicIdentityEditor`; mensajes es/en; tests

## 4. Declarado frente a real

- [x] 4.1 `getTasteFingerprint`: familias de los géneros declarados (solo perfil accesible), `declared` por familia y `declaredMissing`; tests de `stats`
- [x] 4.2 `TasteFingerprint`: marca "declarado" con texto accesible y línea de familias declaradas sin presencia; mensajes es/en; test del componente

## 5. Documentación

- [x] 5.1 `docs/04-api/contracts.md`: `GET /api/genres/search`, cambio de `PUT /api/me/profile/music-identity` y `fingerprint.genres[].declared` / `declaredMissing`
- [x] 5.2 `docs/01-domain/business-rules.md` y `docs/05-features/` (`explore.md`, `user-profile.md`, nueva `genres.md`): chips, herencia marcada, página de género y selector
- [x] 5.3 ADR corto `0024-identidad-generos-contra-taxonomia.md` (validación por tabla en vez de lista fija; slugs retirados se ignoran al mostrar)

## 6. Verificación

- [x] 6.1 Smoke test `scripts/smoke-test-genres.ts` ampliado (o hermano): `getGenrePage`, `searchGenres` y la validación de identidad contra Postgres de scratch, con limpieza
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 6.3 En scratch y en el navegador: chips en artista/álbum/canción en es/en y móvil, página de género (relaciones, paginación, 404), selector de géneros y marca declarado/real en la huella
