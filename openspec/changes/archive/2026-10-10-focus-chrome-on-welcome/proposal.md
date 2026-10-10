## Why

Hallazgo 19 de la auditoría de `/welcome` (2026-10-09): la pantalla de bienvenida muestra el header completo (buscador, Explorar, Listas, Caminos, Actividad, menú de usuario, acciones rápidas) y el footer largo (cuatro columnas de navegación, redes, contacto), igual que cualquier página. Una persona recién registrada tiene tres o cuatro tareas cortas por delante y ve decenas de salidas que compiten con ellas; en móvil el footer añade cientos de píxeles después de los botones del flujo. Tampoco hay un salto al contenido, pero esa carencia solo existe porque hay bloques repetidos que saltar: sin ellos no hace falta.

## What Changes

- **Header de foco**: en `/welcome` el Header se reduce al logo (la salida a Inicio) y al selector de idioma. Sin buscador, navegación general, acciones rápidas ni menú de usuario. El resto del sitio no cambia.
- **Footer de foco**: en `/welcome` el pie se reduce a la **atribución de fuentes de datos** (MusicBrainz, Cover Art Archive, MetaBrainz, no afiliación, retiro de carátulas) y a la barra inferior con copyright y enlaces legales. La atribución no se omite: la pantalla muestra carátulas y datos de esas fuentes y el pie es donde se cumple la licencia (`docs/03-data/data-licensing.md`).
- Un criterio único, `isFocusRoute` (`src/lib/focus-routes.ts`), que hoy lista solo `/welcome`, para sumar otras pantallas de foco sin tocar el Header ni el pie.
- El `<main>` de la bienvenida deja de forzar `min-h-screen`.

## Capabilities

### Modified Capabilities

- `onboarding`: la bienvenida se muestra con navegación reducida.
- `cross-view-navigation`: el Header tiene una variante de foco.
- `site-footer`: el pie tiene una variante reducida que conserva la atribución.

## Impact

- `Header.tsx` (variante), `Footer.tsx` (`variant`), `FooterSlot.tsx` nuevo, `layout.tsx`, `welcome/page.tsx`, `lib/focus-routes.ts`; pruebas.
- `docs/05-features/onboarding.md`, `docs/03-data/data-licensing.md`.

## Non-Goals

- Un salto al contenido global para todo el sitio: es una mejora de accesibilidad aparte (las páginas no tienen un `id` común en `<main>`).
- Convertir otras pantallas (registro, inicio de sesión) en pantallas de foco.
- Cambiar el header o el pie del resto del sitio.
