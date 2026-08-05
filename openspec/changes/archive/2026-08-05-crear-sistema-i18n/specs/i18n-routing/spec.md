## ADDED Requirements

### Requirement: Locale segment in URL
All page routes SHALL be nested under a dynamic `[locale]` segment in the Next.js App Router. The URL structure SHALL be `/{locale}/...` where `locale` is one of the supported locale codes.

#### Scenario: User visits a page with locale prefix
- **WHEN** a user navigates to `/es/search`
- **THEN** the page renders with Spanish translations

#### Scenario: User visits the same page in another locale
- **WHEN** a user navigates to `/en/search`
- **THEN** the page renders with English translations

### Requirement: Default locale redirect
When a user visits the root path `/` without a locale prefix, the middleware SHALL redirect to the default locale (`es`).

#### Scenario: Root path redirects to default locale
- **WHEN** a user navigates to `/`
- **THEN** the browser redirects to `/es`

### Requirement: Locale detection via Accept-Language
The middleware SHALL negotiate the locale from the `Accept-Language` header when the user visits `/`, falling back to `es` if no supported locale matches.

#### Scenario: Browser prefers English
- **WHEN** a user with `Accept-Language: en-US,en;q=0.9` visits `/`
- **THEN** the browser redirects to `/en`

#### Scenario: Browser prefers unsupported locale
- **WHEN** a user with `Accept-Language: fr-FR,fr;q=0.9` visits `/`
- **THEN** the browser redirects to `/es` (default locale)

### Requirement: API routes excluded from locale prefix
Routes under `/api/` SHALL NOT receive a locale prefix. The middleware SHALL exclude API routes from locale detection and redirection.

#### Scenario: API route works without locale
- **WHEN** a request is made to `/api/catalog/search?q=Pink+Floyd`
- **THEN** the request is handled normally without locale redirection

### Requirement: Locale-aware navigation wrapper
All programmatic navigation (`useRouter`, `Link`, `redirect`) SHALL use the wrapper from `src/i18n/navigation.ts`, which automatically preserves the current locale prefix.

#### Scenario: Navigation preserves locale
- **WHEN** a user on `/en/search` submits a search and navigation pushes to `/artist/{id}`
- **THEN** the resulting URL is `/en/artist/{id}`

#### Scenario: Direct import of next/navigation is not used for navigation
- **WHEN** a component imports `useRouter` or `Link`
- **THEN** it imports from `src/i18n/navigation.ts`, not from `next/navigation`

### Requirement: Neutral English slugs for page routes
Page route slugs SHALL be in neutral English, identical across all locales: `/search`, `/artist/[id]`, `/album/[id]`. The locale lives exclusively in the `[locale]` segment.

#### Scenario: Search route is the same in all locales
- **WHEN** a user accesses search in any locale
- **THEN** the route is `/{locale}/search`, not `/{locale}/buscar` or other translated slug

#### Scenario: Artist route uses neutral slug
- **WHEN** a user navigates to an artist profile
- **THEN** the route is `/{locale}/artist/{id}`, not `/{locale}/artista/{id}`

### Requirement: next-intl configuration
`next-intl` SHALL be installed and configured with:
- `src/i18n/routing.ts` as the single source of truth for supported locales
- `src/i18n/request.ts` for Server Component message loading
- `src/i18n/navigation.ts` as the locale-aware navigation wrapper
- The next-intl plugin registered in `next.config.mjs`

#### Scenario: Adding a new locale requires only routing.ts and messages
- **WHEN** a developer adds `"pt"` to `routing.ts` and creates `messages/pt/*.json`
- **THEN** no components, pages, or tests need modification

### Requirement: Language attribute on HTML element
The `<html>` element SHALL receive the `lang` attribute from the resolved locale, not a hardcoded value.

#### Scenario: HTML lang matches locale
- **WHEN** a user visits `/en/search`
- **THEN** the HTML element has `lang="en"`
