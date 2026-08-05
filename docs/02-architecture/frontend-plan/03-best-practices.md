# Buenas prácticas de desarrollo — frontend

Aplican a todas las etapas de `02-implementation-plan.md`. Complementan, sin repetir,
`docs/02-architecture/conventions.md`.

## Tipado

- TypeScript estricto ya está activado (`tsconfig.json`, incluye
  `noUncheckedIndexedAccess`) — mantenerlo, nunca usar `any` ni `as` para silenciar
  errores de tipo.
- Todo dato que **cruza la red** se tipa con `z.infer<typeof Schema>` de
  `src/lib/api/schemas.ts`, nunca directo con `ArtistRow`/`ReleaseGroupRow` de
  `db/schema.ts` — esos tipos son de compilación (Drizzle), no garantizan nada en runtime
  sobre lo que realmente llegó por HTTP. `ArtistRow` y afines se reservan para código que
  corre en el servidor con acceso directo a la base (Server Components, servicios).

## Manejo de errores

- Todo `fetch` pasa por `src/lib/api/client.ts` — ningún componente llama a `fetch`
  directo.
- Nunca mostrar el string `error` del backend directo en la UI: mapear el campo `code`
  (ver `docs/04-api/errors.md`) a un mensaje del catálogo `messages/{locale}/errors.json`
  vía `useTranslations()` — nunca a un diccionario local del componente (ver
  `docs/02-architecture/i18n.md`). Esto desacopla la UI del texto exacto del backend, permite
  testear estados de error sin depender de copy, y evita duplicar el mapeo `code → mensaje`
  por componente.
- Errores inesperados (5xx / `INTERNAL_ERROR`) se loguean en consola en desarrollo y se
  capturan con `error.tsx` (boundary de Next.js) — nunca deben tumbar la página completa
  sin feedback al usuario.

## Autenticación

No aplica todavía: Fase 3 es de solo lectura pública. Se deja `client.ts` preparado para
recibir después un header `Authorization` de forma centralizada, sin que eso implique
refactorizar cada componente que hoy hace fetch.

## Internacionalización (i18n)

**Ver `docs/02-architecture/i18n.md` para la arquitectura completa.** Reglas de aplicación
diaria para quien escribe componentes:

- Ningún string visible al usuario se hardcodea en un componente. Todo texto sale de
  `useTranslations()` (Server o Client Component) contra `messages/{locale}/{namespace}.json`.
- `components/ui/` (`Button`, `Input`, `Skeleton`, `EmptyState`, `ErrorState`) no importa
  `useTranslations` — recibe el texto ya resuelto vía props **requeridas**, nunca con default
  hardcodeado. El componente que sí conoce el dominio (`components/catalog/*`) es responsable
  de traducir antes de pasar el prop.
- Navegación programática (`useRouter`, `Link`) siempre desde `src/i18n/navigation.ts`, nunca
  directo de `next/navigation` — de lo contrario la navegación pierde el prefijo de locale.
- Un namespace nuevo en `catalog.json` se agrega por dominio de flujo (`search`, `artist`,
  `album`), no por página ni por componente individual.
- Antes de marcar cualquier etapa como completa, correr el test de consistencia de claves
  entre locales (`i18n.md` §6) además del resto del gate de QA.

## Consumo de API

- Preferir Server Components + llamada directa a `src/services/catalog/*` para el primer
  render de cada página (ver justificación en `01-frontend-architecture.md`).
- Usar TanStack Query solo para lo que ocurre **después** del primer render: carga
  progresiva de carátulas, búsquedas con debounce, refetch manual.
- Tener presente el rate limit de MusicBrainz (1 req/seg, cola en memoria en
  `musicbrainz/client.ts`): cualquier vista que dispare ingesta de algo nunca antes visto
  puede tardar más de un segundo. El frontend **debe** mostrar estados de carga explícitos
  y no asumir respuestas instantáneas, sobre todo en la primera visita a un artista o
  álbum.

## Reutilización de componentes

- `components/ui/` (agnóstico de dominio y de i18n, reutilizable también en Fase 4/5)
  separado de `components/catalog/` (acoplado al dominio música y responsable de resolver
  traducciones). No crear componentes de dominio dentro de `app/`.
- Todo uso de imagen de carátula pasa por un único componente
  (`AlbumCover`/`LazyCoverImage`), que internamente usa `coverThumbUrl()` — nunca construir
  la URL de carátula a mano en otro lugar (ver riesgo de licenciamiento en
  `04-risks.md`).

## Pruebas

- **Unitarias** (Vitest): `src/lib/api/*`, mockeando `fetch`.
- **De componente** (Testing Library): estados de carga/error/vacío de cada componente de
  `components/catalog/`. Usar **siempre** `renderWithIntl()` de `src/test/i18n-test-utils.tsx`
  en vez de `render()` — envuelve el árbol en `NextIntlClientProvider` con los mensajes del
  locale bajo prueba (default `es`). Las aserciones de texto se hacen contra el valor real
  importado del catálogo (`messages/es/*.json`), nunca repitiendo el string a mano en el test,
  para que test y componente se muevan juntos si cambia la copy.
- **De consistencia de mensajes**: test dedicado que compara `Object.keys` de cada namespace
  entre todos los locales activos y falla ante cualquier clave faltante (ver `i18n.md` §6).
- **End-to-end** (Playwright, cuando se decida incorporarlo): el flujo de referencia del
  roadmap — buscar "Pink Floyd" → ver discografía → abrir "The Dark Side of the Moon" →
  ver tracklist. Los fixtures de `scripts/smoke-test-ingestion.ts` (mocks de respuestas de
  MusicBrainz) sirven de inspiración directa para no depender de la red real en CI.
- Ninguna etapa se marca completa sin que sus criterios de aceptación (definidos en
  `02-implementation-plan.md`) estén verificados, aunque sea manualmente mientras no exista
  todavía el test automatizado correspondiente.

## Convenciones de nombres y rutas

- Seguir `docs/02-architecture/conventions.md` (`snake_case` en DB, `camelCase`/`PascalCase`
  en TS, `kebab-case` en rutas de API).
- Las rutas de **página** (`/search`, `/artist/[id]`, `/album/[id]`) usan slugs neutros en
  inglés, iguales para todos los locales — el idioma vive solo en el segmento `[locale]` de la
  URL, nunca en el slug (ver ADR 0007 y `conventions.md`). Esto reemplaza la propuesta original
  de este documento (slugs en español), vigente hasta la confirmación de soporte multi-idioma.
  Las rutas de **API** quedan sin cambios, en inglés (`/api/catalog/...`).

## CI

- Cada etapa debe pasar `npm run typecheck && npm run lint && npm run test && npm run build`
  (igual que `.github/workflows/ci.yml`) antes de marcarse como completa.
- El workflow de CI corre el paso de tests desde que la Etapa 3.0 dejó Vitest configurado;
  el test de consistencia de mensajes (i18n) corre como parte de ese mismo paso.
