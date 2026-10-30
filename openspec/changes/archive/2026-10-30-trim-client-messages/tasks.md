## 1. Medición

- [x] 1.1 Build de producción y `next start`; tamaño del HTML y de la respuesta RSC (sin comprimir y gzip) de Inicio
      (con sesión y anónima), un álbum, `/me/settings/profile` y `/me/feed`, en es y en.

## 2. Análisis y generador

- [x] 2.1 `src/i18n/client-messages-analysis.ts`: grafo de imports por archivo de ruta, módulos cliente, claves por
      `useTranslations` (literales, uniones, prefijos, `t` pasada a funciones y componentes), reparto por proveedor y
      convenciones.
- [x] 2.2 `src/i18n/pick-messages.ts` (selección y fusión) y `client-messages-manifest.ts`.
- [x] 2.3 `scripts/generate-client-messages.ts` y `pnpm run i18n:client-messages` (con `--check`).

## 3. Proveedores

- [x] 3.1 `ClientMessages`, `withClientMessages` y `NestedMessages`.
- [x] 3.2 Layout raíz con `<ClientMessages scope="layout">`.
- [x] 3.3 `withClientMessages` en las 69 rutas que piden textos propios.
- [x] 3.4 Tipar como unión de literales las claves que llegaban como `string` (menú de usuario, secciones de
      comunidad, `UserList`, `moderationKey`).

## 4. Pruebas

- [x] 4.1 `client-messages.test.ts` (archivo al día y convenciones), `pick-messages.test.ts`,
      `NestedMessages.test.tsx` y `client-messages-provider.test.tsx`.
- [x] 4.2 `src/test/setup.ts`: `withClientMessages` sin efecto en jsdom; suite completa en verde.

## 5. Cierre

- [x] 5.1 Docs: ADR 0048, `docs/02-architecture/i18n.md` §9, `code-walkthrough.md`, `AGENTS.md`.
- [x] 5.2 Medición después del cambio y tabla antes/después en `docs/02-architecture/i18n.md`.
- [x] 5.3 Verificación en el navegador de las páginas medidas, en es y en, sin `MISSING_MESSAGE`.
- [x] 5.4 `pnpm run typecheck && pnpm run lint && pnpm run build`.
