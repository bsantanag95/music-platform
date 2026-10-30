# i18n-messages

## Purpose

Organization and rules of the message catalogs: namespaces per locale and domain, key completeness across locales, the error catalog indexed by ErrorCode, and the boundary that musical catalog data is not translated.
## Requirements
### Requirement: Message catalogs by locale and domain
Message files SHALL be organized as `messages/{locale}/{namespace}.json` with three namespaces: `common` (app identity, generic actions), `catalog` (catalog browsing flows by sub-namespace), and `errors` (indexed by ErrorCode).

#### Scenario: Spanish messages exist for all namespaces
- **WHEN** the project is built
- **THEN** `messages/es/common.json`, `messages/es/catalog.json`, and `messages/es/errors.json` exist

#### Scenario: English messages exist for all namespaces
- **WHEN** the project is built
- **THEN** `messages/en/common.json`, `messages/en/catalog.json`, and `messages/en/errors.json` exist

### Requirement: Key completeness across locales
Every active locale SHALL have exactly the same keys in each namespace. A missing key in any locale SHALL cause the test suite to fail.

#### Scenario: Missing key in English catalog fails tests
- **WHEN** `messages/en/catalog.json` is missing a key that exists in `messages/es/catalog.json`
- **THEN** the consistency test fails and CI reports the missing key

#### Scenario: Nested keys are compared recursively
- **WHEN** a nested key like `search.fieldLabel` exists in `es/catalog.json` but not in `en/catalog.json`
- **THEN** the consistency test detects and reports the missing nested key

### Requirement: errors.json indexed by ErrorCode
`errors.json` SHALL mirror 1:1 the `ErrorCode` enum from `src/lib/api/schemas.ts`, with each code mapping to a `title` and `description` per locale.

#### Scenario: All ErrorCode values have entries in errors.json
- **WHEN** `schemas.ts` defines `VALIDATION_ERROR`, `ARTIST_NOT_FOUND`, `ALBUM_NOT_FOUND`, `NO_EDITIONS_FOUND`, `INTERNAL_ERROR`
- **THEN** each of these codes has a corresponding entry in `messages/{locale}/errors.json` with `title` and `description`

#### Scenario: Error message resolved via useTranslations
- **WHEN** a component receives `ApiError.code = "ARTIST_NOT_FOUND"`
- **THEN** it resolves the title and description via `useTranslations("errors").raw("ARTIST_NOT_FOUND")`

### Requirement: catalog.json organized by flow sub-namespace
`catalog.json` SHALL organize messages by flow sub-namespace (`search`, `artist`, `album`), not by page or component.

#### Scenario: Search flow messages grouped under search namespace
- **WHEN** a component needs search-related strings
- **THEN** it accesses them via `useTranslations("catalog").rich("search.fieldLabel")` or equivalent

### Requirement: common.json for app identity and generic actions
`common.json` SHALL contain the app name, tagline, and generic actions (e.g., "Retry") used across any component.

#### Scenario: App name resolved from common.json
- **WHEN** the landing page renders
- **THEN** the app name comes from `useTranslations("common").raw("appName")`

### Requirement: Server Components can consume translations
Server Components SHALL be able to load and use translations without being converted to Client Components, via `next-intl`'s Server Component support.

#### Scenario: Server Component renders translated content
- **WHEN** `search/page.tsx` is a Server Component
- **THEN** it can resolve translated strings via `getTranslations` from `next-intl`

### Requirement: Catalog musical data is NOT translated
Data from MusicBrainz (artist names, album titles, song titles, biographies) SHALL be displayed as-is, without translation. i18n applies only to the UI chrome.

#### Scenario: Artist name displayed in original language
- **WHEN** an artist named "Pink Floyd" is displayed in any locale
- **THEN** the name appears as "Pink Floyd", not translated

#### Scenario: Album title displayed in original language
- **WHEN** an album titled "The Dark Side of the Moon" is displayed in any locale
- **THEN** the title appears as-is, not translated

### Requirement: Initial message catalogs for search flow
The initial `catalog.json` SHALL contain the `search` sub-namespace with all strings extracted from the current `SearchForm.tsx` and `buscar/page.tsx`: field label, placeholder, submit button text, submitting state text, validation message, loading hint, and retry text.

#### Scenario: All search strings externalized
- **WHEN** `SearchForm.tsx` renders
- **THEN** no visible string is hardcoded — all come from `useTranslations("catalog").rich("search.*")`

### Requirement: El cliente recibe solo los textos que usan sus componentes

El cliente SHALL recibir, en cada ruta, solo las claves de mensajes que usan los componentes cliente de esa ruta, y
nunca el catálogo completo. El layout raíz SHALL entregar únicamente lo que piden sus propios archivos (cabecera, menú
de usuario, pie, error y no encontrado). Cada página o layout cuyos componentes cliente pidan más SHALL declarar su
proveedor con `export default withClientMessages("<archivo de ruta>", Ruta)`, que entrega solo lo que no entregan los
proveedores superiores y se fusiona sobre ellos en el cliente. Cuando una clave no se pueda acotar estáticamente, el
proveedor SHALL entregar su prefijo estático o el namespace entero.

#### Scenario: Una página recibe solo sus textos

- **WHEN** se abre `/es/me/feed`
- **THEN** la respuesta lleva los textos del layout raíz y los de los componentes cliente del feed, y no los de otras
  áreas (por ejemplo los de la pantalla de perfil de ajustes)

#### Scenario: Ninguna clave falta en el cliente

- **WHEN** un componente cliente de una ruta llama a `t("clave")` con un namespace de `useTranslations`
- **THEN** esa clave está en los textos que recibe el cliente en esa ruta, en es y en en

#### Scenario: Clave dinámica

- **WHEN** un componente llama a `` t(`kinds.${kind}`) ``
- **THEN** el cliente recibe todo el subárbol `kinds` de ese namespace

### Requirement: El reparto de textos se verifica en CI

El reparto de textos por ruta SHALL generarse a partir del código (`pnpm run i18n:client-messages` escribe
`src/i18n/client-messages.json`) y una prueba SHALL fallar si el archivo no coincide con el código, si una ruta pide
textos que el layout raíz no entrega sin declarar su proveedor, si un proveedor no coincide con su archivo de ruta o si
no aporta textos.

#### Scenario: Clave nueva sin regenerar

- **WHEN** un componente cliente empieza a usar una clave nueva y no se regenera `client-messages.json`
- **THEN** la prueba de textos del cliente falla y pide correr `pnpm run i18n:client-messages`

#### Scenario: Página nueva con textos propios

- **WHEN** se agrega una página cuyos componentes cliente usan textos que el layout raíz no entrega, sin
  `withClientMessages`
- **THEN** la prueba falla nombrando el archivo de ruta

