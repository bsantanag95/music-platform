## Why

Durante el rediseño de `/me/settings` (2026-10-29) se midió que cada respuesta pesa ~195 KB y que ~165 KB son el objeto
`messages` completo: el layout raíz `src/app/[locale]/layout.tsx` pasa **todos** los textos de la app (es o en) a
`<NextIntlClientProvider messages={messages}>`. Cada página, también en la navegación del cliente, carga con los textos de
todas las demás aunque sus componentes cliente usen una fracción. El usuario decidió tratarlo como un cambio aparte.

Línea base en un build de producción (`next start`, sesión iniciada salvo "Inicio anónima"), bytes sin comprimir:

| Página | HTML es | RSC es | HTML en | RSC en |
|---|---:|---:|---:|---:|
| Inicio | 336 510 | 234 092 | 326 843 | 224 669 |
| Álbum | 322 078 | 231 233 | 312 411 | 221 854 |
| `/me/settings/profile` | 259 629 | 201 349 | 250 046 | 192 007 |
| `/me/feed` | 233 585 | 195 105 | 224 029 | 185 785 |

## What Changes

- **El layout raíz entrega solo los textos de la cabecera, el menú de usuario, el pie y las páginas de error**
  (`<ClientMessages scope="layout">`, ~20 KB en `es`).
- **Cada página o layout cuyos componentes cliente piden más** se exporta con
  `withClientMessages("<archivo de ruta>", Pagina)`: añade solo lo que no entrega un proveedor superior, y un proveedor
  cliente (`NestedMessages`) lo fusiona sobre el del padre.
- **Qué claves recibe cada proveedor lo calcula un análisis estático** sobre el código (TypeScript, ya dependencia del
  proyecto): `scripts/generate-client-messages.ts` (`pnpm run i18n:client-messages`) escribe
  `src/i18n/client-messages.json`, y una prueba falla si quedó viejo o si una página pide textos sin declarar su
  proveedor. Ante la duda entrega más (el prefijo o el namespace), nunca menos.
- Unos pocos componentes tipan sus claves como unión de literales en vez de `string` para que el análisis las acote
  (`UserMenuLabelKey`, `headingKey` de las secciones de comunidad, `actionLabel` de `UserList`, `moderationKey`).

### Goals

- Bajar el peso de cada respuesta RSC y HTML sin que falte ninguna clave en el cliente.
- Que agregar una página o una clave no pueda dejar textos fuera sin que lo note CI.

### Non-Goals

- Reorganizar los namespaces de `messages/` o mover textos entre archivos.
- Cambiar cómo cargan los mensajes los Server Components (`src/i18n/request.ts` sigue cargando todo en el servidor).
- Acotar `errors`: sus códigos llegan de la API en runtime y va entero en el layout raíz.
- Comprimir o cachear los textos aparte del payload (por ejemplo un JSON estático por ruta).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `i18n-messages`: nueva regla sobre qué textos recibe el cliente y cómo se mantiene.

## Impact

- `src/app/[locale]/layout.tsx` y 69 archivos de ruta (`export default withClientMessages(...)`).
- Nuevos: `src/i18n/client-messages.tsx`, `NestedMessages.tsx`, `pick-messages.ts`, `client-messages-analysis.ts`,
  `client-messages-manifest.ts`, `client-messages.json`, `scripts/generate-client-messages.ts` y sus pruebas.
- `src/test/setup.ts`: `withClientMessages` sin efecto en jsdom.
- Docs: ADR 0048, `docs/02-architecture/i18n.md` §9, `code-walkthrough.md`, `AGENTS.md` (comando nuevo).
- Sin cambios de API, de esquema ni dependencias nuevas.
