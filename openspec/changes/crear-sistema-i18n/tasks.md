## 1. Instalación y configuración base

- [x] 1.1 Instalar `next-intl` compatible con Next 15 / React 19 y actualizar `package.json`
- [x] 1.2 Registrar el plugin de `next-intl` en `next.config.mjs`
- [x] 1.3 Crear `src/i18n/routing.ts` con locales `es` (default) y `en`
- [x] 1.4 Crear `src/i18n/request.ts` para carga de mensajes en Server Components
- [x] 1.5 Crear `src/i18n/navigation.ts` reexportando `Link`, `useRouter`, `redirect` locale-aware
- [x] 1.6 Crear `src/middleware.ts` con detección de `Accept-Language`, fallback a `es`, y matcher que excluye `/api/`, `_next/`, archivos estáticos

## 2. Catálogos de mensajes iniciales

- [x] 2.1 Crear `messages/es/common.json` con `appName`, `tagline`, `retry`
- [x] 2.2 Crear `messages/en/common.json` con las mismas claves traducidas
- [x] 2.3 Crear `messages/es/catalog.json` con sub-namespace `search` (fieldLabel, placeholder, submit, submitting, validationEmpty, loadingHint, searchAgain)
- [x] 2.4 Crear `messages/en/catalog.json` con las mismas claves traducidas
- [x] 2.5 Crear `messages/es/errors.json` con los 5 ErrorCode (`VALIDATION_ERROR`, `ARTIST_NOT_FOUND`, `ALBUM_NOT_FOUND`, `NO_EDITIONS_FOUND`, `INTERNAL_ERROR`) con `title` y `description`
- [x] 2.6 Crear `messages/en/errors.json` con las mismas claves traducidas

## 3. Reestructuración de rutas bajo `[locale]`

- [x] 3.1 Crear `src/app/[locale]/` y mover `layout.tsx` debajo
- [x] 3.2 Mover `page.tsx` a `src/app/[locale]/page.tsx`
- [x] 3.3 Mover `providers.tsx` a `src/app/[locale]/providers.tsx`
- [x] 3.4 Mover `(catalog)/buscar/` a `(catalog)/search/` bajo `src/app/[locale]/`
- [x] 3.5 Eliminar la estructura vieja `src/app/(catalog)/buscar/`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/providers.tsx`
- [x] 3.6 Verificar que las rutas de API (`src/app/api/`) no se movieron ni se afectaron

## 4. Migración de layout y metadata

- [x] 4.1 Modificar `src/app/[locale]/layout.tsx` para recibir `locale` de `params`, pasar `lang={locale}` al `<html>`, y envolver en `NextIntlClientProvider`
- [x] 4.2 Migrar `metadata` estática a `generateMetadata` con traducciones de `common.json`
- [x] 4.3 Actualizar `providers.tsx` para trabajar dentro del provider de i18n

## 5. Migración de componentes con i18n

- [x] 5.1 Modificar `SearchForm.tsx`: reemplazar `ERROR_MESSAGES` local por `useTranslations("errors")`, extraer todos los strings a `useTranslations("catalog").rich("search.*")`, cambiar import de `useRouter` a `src/i18n/navigation.ts`, cambiar navegación de `/artista/` a `/artist/`
- [x] 5.2 Modificar `src/app/[locale]/(catalog)/search/page.tsx`: título de página vía `getTranslations` (Server Component)
- [x] 5.3 Modificar `src/app/[locale]/page.tsx`: tagline y nombre de app vía `getTranslations`
- [x] 5.4 Modificar `ErrorState.tsx`: `title` y `description` como props requeridos, agregar `retryLabel` como prop requerido cuando `onRetry` existe, eliminar defaults hardcodeados
- [x] 5.5 Modificar `EmptyState.tsx`: `description` como prop requerida (no opcional), eliminar defaults hardcodeados
- [x] 5.6 Modificar `Skeleton.tsx`: agregar prop opcional `ariaLabel`, eliminar `aria-label="Cargando"` hardcodeado

## 6. Infraestructura de testing

- [x] 6.1 Crear `src/test/i18n-test-utils.tsx` con `renderWithIntl(ui, locale?)`
- [x] 6.2 Crear test de consistencia de claves entre `messages/es/` y `messages/en/` (comparación recursiva)
- [x] 6.3 Modificar `SearchForm.test.tsx`: reemplazar `render()` por `renderWithIntl()`, mockear `src/i18n/navigation.ts` en vez de `next/navigation`, aserciones de texto leídas desde `messages/es/*.json`

## 7. Documentación

- [x] 7.1 Actualizar `docs/01-domain/business-rules.md`: agregar regla de que los datos del catálogo musical no se traducen
- [x] 7.2 Actualizar `docs/05-features/catalog-browsing.md`: anotar que i18n aplica solo al chrome de la interfaz
- [x] 7.3 Actualizar `docs/02-architecture/code-walkthrough.md`: agregar entrada del retrofit de i18n (mismo estilo que entradas de bugs existentes)
- [x] 7.4 Actualizar `docs/README.md`: agregar entrada para `i18n.md` y ADR 0007 en el índice si no existen
- [x] 7.5 Actualizar `docs/02-architecture/frontend-plan/README.md`: reflejar que Etapa 3.0b está completa
- [x] 7.6 Actualizar `docs/02-architecture/frontend-plan/02-implementation-plan.md`: marcar Etapa 3.0b como 🟢 completa

## 8. Validación final

- [x] 8.1 Ejecutar `npm run typecheck` — 0 errores
- [x] 8.2 Ejecutar `npm run lint` — 0 errores
- [x] 8.3 Ejecutar `npm run test` — todos los tests pasando (incluyendo consistencia de mensajes)
- [x] 8.4 Ejecutar `npm run build` — sin warnings de `next/image`, 6+ rutas generadas
- [x] 8.5 Verificar manualmente: `/` redirige a `/es`, `/en` sirve landing en inglés, `/es/search` responde, `/buscar` ya no existe
