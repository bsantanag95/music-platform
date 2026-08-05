## ADDED Requirements

### Requirement: UI components are i18n-agnostic
No component in `src/components/ui/` SHALL import `useTranslations` or access the active locale. All text SHALL be received via required props with no hardcoded defaults.

#### Scenario: ErrorState receives translated text via props
- **WHEN** `ErrorState` is rendered
- **THEN** `title` and `description` are required props with no default values

#### Scenario: EmptyState receives translated text via props
- **WHEN** `EmptyState` is rendered
- **THEN** `title` is required and `description` is required (no longer optional)

#### Scenario: Skeleton receives optional aria-label via props
- **WHEN** `Skeleton` is rendered
- **THEN** it accepts an optional `ariaLabel` prop; when not provided, no `aria-label` attribute is rendered

### Requirement: Domain components resolve translations before passing to UI components
Components in `src/components/catalog/` SHALL resolve translations via `useTranslations` and pass the resolved text to `components/ui/` components.

#### Scenario: SearchForm resolves error messages before passing to ErrorState
- **WHEN** `SearchForm` catches an `ApiError` with code `INTERNAL_ERROR`
- **THEN** it resolves `title` and `description` from `errors.json` and passes them as props to `ErrorState`

#### Scenario: SearchForm resolves not-found messages before passing to EmptyState
- **WHEN** `SearchForm` receives `ARTIST_NOT_FOUND`
- **THEN** it resolves `title` and `description` from `errors.json` and passes them as props to `EmptyState`

### Requirement: ErrorState retry button label is a required prop
The retry button label in `ErrorState` SHALL be received as a required `retryLabel` prop, not hardcoded.

#### Scenario: ErrorState renders caller-provided retry label
- **WHEN** `ErrorState` is rendered with `onRetry` and `retryLabel="Reintentar"`
- **THEN** the button displays "Reintentar"

#### Scenario: ErrorState without onRetry does not render retry button
- **WHEN** `ErrorState` is rendered without `onRetry`
- **THEN** no retry button is rendered regardless of `retryLabel`

### Requirement: Test utility wraps components in NextIntlClientProvider
The test utility `renderWithIntl(ui, locale?)` from `src/test/i18n-test-utils.tsx` SHALL wrap the component tree in `NextIntlClientProvider` with messages from the specified locale (default `es`).

#### Scenario: Component test uses renderWithIntl
- **WHEN** a test calls `renderWithIntl(<SearchForm />)`
- **THEN** the component renders with Spanish messages from `messages/es/`

#### Scenario: Component test can specify locale
- **WHEN** a test calls `renderWithIntl(<SearchForm />, "en")`
- **THEN** the component renders with English messages from `messages/en/`

### Requirement: Component tests assert on real rendered text
Component tests SHALL assert on the actual rendered text imported from message catalogs, not on hardcoded string literals.

#### Scenario: SearchForm test reads expected text from messages
- **WHEN** a test asserts on the search button label
- **THEN** it reads the expected value from `messages/es/catalog.json` (`search.submit`) instead of hardcoding "Buscar"

### Requirement: Navigation mock in tests targets i18n wrapper
Tests that mock navigation SHALL mock `src/i18n/navigation.ts`, not `next/navigation` directly.

#### Scenario: SearchForm navigation test mocks i18n router
- **WHEN** a test verifies that search submission navigates to the artist page
- **THEN** it mocks `useRouter` from `src/i18n/navigation.ts` and asserts the pushed path includes the locale prefix
