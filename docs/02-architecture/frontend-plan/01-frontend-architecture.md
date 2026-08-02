# Etapa 1 — Arquitectura del frontend

**Objetivo:** definir estructura de carpetas, stack, y cómo el frontend habla con los
datos, antes de escribir componentes concretos.

**Estado: 🟢 Confirmada.** Los puntos de `00-backend-analysis.md` quedaron resueltos —
stack REST confirmado (ADR 0006), TanStack Query aceptado como elección técnica estándar.

## Stack recomendado y nuevas dependencias

El proyecto ya define Next.js (App Router) + TypeScript estricto + Drizzle/PostgreSQL
(`README.md`, `tsconfig.json`). No hay CSS framework ni librería de fetching/estado hoy.
Se propone agregar:

| Dependencia | Para qué | Tipo |
|---|---|---|
| `tailwindcss` (v4) + `@tailwindcss/postcss` + `postcss` | Estilos, con configuración CSS-first (`@theme` en `globals.css`, sin `tailwind.config.ts` ni `autoprefixer` — cambio real de v4 frente a v3) | dependency |
| `zod` | Validar en runtime las respuestas de `/api/catalog/*` — hoy nada valida que el JSON recibido cumple con `ArtistRow`/`ReleaseGroupRow`, son solo tipos de compilación | dependency |
| `@tanstack/react-query` | Cache y estado de datos remotos del lado del cliente (carga progresiva de carátulas, búsquedas) | dependency |
| `vitest` + `@testing-library/react` + `jsdom` | Tests unitarios/de componentes — no hay test runner configurado hoy | devDependency |
| `@playwright/test` (opcional en esta fase) | Test end-to-end del flujo buscar → artista → álbum | devDependency |

Estas dependencias son nuevas y afectan `package.json` y `.github/workflows/ci.yml` (que
hoy solo corre `typecheck`, `lint`, `build`, sin paso de tests) — se listan acá para que
queden documentadas antes de instalarlas, no porque su elección requiera la misma
confirmación explícita que los puntos de `00-backend-analysis.md` (son elecciones técnicas
estándar de bajo riesgo).

## Estructura de carpetas propuesta

```
src/
├── app/
│   ├── api/catalog/...              (ya existe — sin cambios de esta etapa,
│   │                                  salvo las brechas de 04-api/contracts.md)
│   ├── (catalog)/                   route group para las vistas públicas de catálogo
│   │   ├── buscar/page.tsx          página de búsqueda → /buscar
│   │   ├── artista/[id]/page.tsx    perfil de artista → /artista/:id
│   │   └── album/[id]/page.tsx      detalle de álbum + tracklist → /album/:id
│   ├── error.tsx                    boundary de error genérico (nuevo)
│   ├── not-found.tsx                404 genérico (nuevo)
│   ├── providers.tsx                QueryClientProvider (nuevo)
│   ├── layout.tsx                   (ya existe — se agrega Header + providers)
│   └── page.tsx                     (ya existe — pasa a ser el landing con buscador)
├── components/
│   ├── ui/                          atómicos, agnósticos de dominio (Button, Input,
│   │                                 Skeleton, EmptyState, ErrorState) — reutilizables
│   │                                 en Fase 4/5
│   ├── catalog/                     acoplados al dominio música (ArtistHeader,
│   │                                 AlbumGrid, AlbumCard, TrackList, LazyCoverImage)
│   └── layout/                      Header, buscador global
├── lib/
│   ├── api/
│   │   ├── client.ts                fetch wrapper tipado + manejo de errores (nuevo)
│   │   ├── schemas.ts                esquemas zod espejo de las respuestas del backend (nuevo)
│   │   └── catalog.ts               funciones de alto nivel: searchCatalog, getArtist... (nuevo)
│   └── query/keys.ts                query keys de TanStack Query centralizadas (nuevo)
├── db/, services/                   (ya existen — sin cambios salvo las brechas puntuales
│                                      de backend descriptas en 04-api/contracts.md)
```

**Por qué un route group `(catalog)`:** deja espacio para agrupar `(auth)` u otros grupos
en Fase 4 sin mezclar rutas ni URLs — el route group no aparece en la URL final.

## Server Components como estrategia por defecto

Next.js App Router permite hacer `fetch`/consultas directamente en Server Components. Se
propone que las tres páginas principales (`buscar`, `artista/[id]`, `album/[id]`) obtengan
su **carga inicial** así, en vez de a través de una llamada HTTP a su propia API:

- Los Server Components importan y llaman directo a las funciones de
  `src/services/catalog/*` (ej. `findOrIngestTracklist`), igual que ya lo hacen los route
  handlers hoy — se evita un round-trip HTTP innecesario dentro del mismo proceso, y se
  reutiliza toda la lógica de ingesta ya escrita y probada.
- Los route handlers de `/api/catalog/*` quedan como contrato público para: (a)
  interacciones que ocurren después del primer render (ej. carga progresiva de carátulas
  vía `LazyCoverImage`, que sí corre en el cliente), y (b) cualquier consumidor externo
  futuro de la API.
- **TanStack Query se usa solo donde hay interactividad del lado del cliente** — no para
  la carga inicial de página, que ya resuelve React Server Components sin spinners.

Esto es una decisión de implementación (no requiere la misma confirmación que los
bloqueantes de `00-backend-analysis.md`), pero se anota acá explícitamente porque es una
desviación consciente del patrón ingenuo "el frontend siempre llama a su propia API".

## Manejo de estado global

Fase 3 es de solo lectura y sin autenticación: **no se necesita** una librería de estado
global (Redux/Zustand/Context pesado) todavía.

- Estado de **datos remotos**: cache de TanStack Query (solo para lo que corre en el
  cliente, ver arriba).
- Estado de **UI local** (input del buscador, filtros): `useState` por componente.
- Se deja anotado que esto se re-evalúa en Fase 4, cuando aparezca sesión de usuario
  (probablemente un Context de auth simple, no una librería de estado global completa).

## Manejo de imágenes

`next/image` en vez de `<img>` para las carátulas (optimización automática). Requiere
agregar `coverartarchive.org` a `images.remotePatterns` en `next.config.mjs`. Todo uso de
carátula pasa exclusivamente por `coverThumbUrl()` (`src/services/cover-art.ts`) —
ver riesgo de licenciamiento en `04-risks.md`.

## Testing

Sin test runner configurado hoy (`package.json` no tiene `test` script, CI no corre
tests). Se propone Vitest + Testing Library para unit/componentes, con un test e2e de
Playwright cubriendo el flujo de referencia del roadmap (Pink Floyd / Roger Waters) más
adelante. Detalle en `03-best-practices.md`.
