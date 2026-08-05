## Context

La Etapa 3.1 construyó las primeras vistas del catálogo (landing + búsqueda) con textos hardcodeados en español, rutas en español (`/buscar`, `/artista/[id]`), y sin infraestructura de internacionalización. El ADR 0007 ya estableció la decisión de usar `next-intl` con segmento `[locale]` en la URL, pero la implementación aún no se ejecutó. Este retrofit debe completarse antes de la Etapa 3.2 para no acumular deuda técnica con cada vista nueva.

**Estado actual:** `src/app/` contiene `layout.tsx` (con `lang="es"` fijo), `page.tsx`, `providers.tsx`, `(catalog)/buscar/page.tsx`, y las rutas de API en `api/catalog/*`. `SearchForm.tsx` importa `useRouter` de `next/navigation` directo y tiene un objeto `ERROR_MESSAGES` local. `ErrorState` y `EmptyState` tienen defaults en español. No existe `next-intl`, `src/i18n/`, `messages/`, ni `middleware.ts`.

**Restricciones:** Las rutas de API (`/api/catalog/*`) no llevan prefijo de locale. Los datos del catálogo musical (nombres, títulos, biografías de MusicBrainz) no se traducen. Server Components deben poder consumir traducciones sin convertirse en Client Components.

## Goals / Non-Goals

**Goals:**
- Introducir `next-intl` con locales `es` (default) y `en`, extensible a futuros locales tocando solo `routing.ts` y los catálogos de mensajes.
- Reestructurar las páginas bajo `src/app/[locale]/` con slugs neutros en inglés (`/search`, `/artist/[id]`).
- Extraer todos los strings visibles a `messages/{locale}/{namespace}.json`.
- Hacer que la navegación programática preserve el locale activo.
- Que `components/ui/` sea agnóstico de i18n (texto recibido vía props requeridas).
- Agregar test de consistencia de claves entre locales al gate de QA.

**Non-Goals:**
- Traducir datos del catálogo musical (nombres de artistas, álbumes, canciones, biografías).
- Cambiar contratos de API ni rutas de `/api/catalog/*`.
- Agregar selector de idioma en la UI (se construye en Etapa 3.4 con el Header).
- Soporte para RTL o formatos de número/fecha localizados más allá del default de `next-intl`.

## Decisions

### 1. `next-intl` como librería de i18n

**Decisión:** Usar `next-intl` con el patrón de segmento `[locale]` en la URL.

**Razón:** Es la única librería con soporte real de Server Components en App Router, preserva la arquitectura ya decidida en `01-frontend-architecture.md` de usar Server Components para el primer render. Alternativas como `react-i18next` forzarían Client Components.

**Alternativas consideradas:** Ver ADR 0007 para el análisis completo.

### 2. Locale en la URL, no en cookie/sesión

**Decisión:** Todo el árbol de páginas bajo `src/app/[locale]/`. `/` redirige a `/es` vía middleware.

**Razón:** Coherente con ADR 0001 (PWA + Web Share API) — un link compartido debe abrir en el idioma correcto sin depender de cookies del dispositivo receptor.

### 3. Slugs de ruta neutros en inglés

**Decisión:** `/search`, `/artist/[id]`, `/album/[id]` — iguales para todos los locales.

**Razón:** Evita el mapeo de rutas por idioma que crece con cada locale nuevo. El slug no es contenido de marketing en un catálogo musical.

### 4. Catálogos por dominio, no por página

**Decisión:** `common.json` (identidad + acciones genéricas), `catalog.json` (flujos del catálogo por sub-namespace: `search`, `artist`, `album`), `errors.json` (indexado por `ErrorCode`).

**Razón:** Sigue el mismo principio que `docs/` (subcarpetas por capa) y `schemas.ts` (agrupado por contrato). Un namespace nuevo se agrega cuando aparece un dominio nuevo, no una página nueva.

### 5. `errors.json` separado de `catalog.json`

**Decisión:** Indexado 1:1 por `ErrorCode` de `schemas.ts`, no por dominio de UI.

**Razón:** El mismo `code` (`INTERNAL_ERROR`) puede originarse desde cualquier pantalla. Centralizarlo evita que cada componente reinvente su mapeo de errores.

### 6. `components/ui/` agnóstico de i18n

**Decisión:** Ningún componente de `ui/` importa `useTranslations`. Recibe texto traducido vía props requeridas, sin defaults.

**Razón:** Extiende la regla ya existente de "agnóstico de dominio" a i18n. El compilador atrapa la omisión del prop en vez de un usuario viendo texto en el idioma incorrecto.

### 7. Navegación siempre vía `src/i18n/navigation.ts`

**Decisión:** `Link`, `useRouter`, `redirect` se importan del wrapper, nunca de `next/navigation` directo.

**Razón:** Sin el wrapper, `router.push('/artist/${id}')` desde un usuario en `/en/search` lo devuelve a una ruta sin prefijo de locale, perdiendo el idioma silenciosamente.

### 8. `Skeleton` sin `aria-label` hardcodeado

**Decisión:** `Skeleton` acepta un prop opcional `ariaLabel` con default `undefined`. Cuando el caller necesita accesibilidad, pasa el label traducido.

**Razón:** `aria-label="Cargando"` hardcodeado rompe la regla de agnosticismo de i18n en `components/ui/`. Como `Skeleton` no se usa todavía en componentes visibles al usuario (Etapa 3.2+), se resuelve preventivamente.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| `next-intl` incompatible con Next 15 / React 19 | Verificar compatibilidad de versión antes de instalar. next-intl 3.x soporta App Router con React 19. |
| Middleware con matcher incorrecto redirige APIs o assets | El matcher excluye explícitamente `/api/`, `_next/`, `favicon.ico`, y archivos estáticos. |
| Test de consistencia no detecta claves anidadas | Comparación recursiva de `Object.keys`, no solo shallow. |
| Migración de rutas rompe bookmarks existentes | `/buscar` y `/artista/*` pueden redirigir temporalmente a las nuevas rutas (fuera de alcance de esta etapa, pero anotado). |
| `metadata` en `layout.tsx` es estática y no se localiza | Se migra a `generateMetadata` con `useTranslations` de `next-intl` en Server Components. |

## Migration Plan

1. Instalar `next-intl`.
2. Crear infraestructura (`src/i18n/`, `middleware.ts`, `messages/`).
3. Mover páginas bajo `[locale]`, renombrar rutas.
4. Migrar componentes y tests.
5. Gate: `typecheck`, `lint`, `test`, `build`.

**Rollback:** Revertir el commit. Las rutas viejas (`/buscar`, `/artista/`) dejan de existir; si se necesita compatibilidad, se agregan redirects en `middleware.ts` antes del rollback.

## Open Questions

- ¿Se agregan redirects de `/buscar` → `/es/search` y `/artista/*` → `/es/artist/*` en esta etapa, o se dejan para 3.4 con el Header? **Decisión:** Fuera de alcance de esta etapa. Se anota como tarea pendiente para 3.4.
