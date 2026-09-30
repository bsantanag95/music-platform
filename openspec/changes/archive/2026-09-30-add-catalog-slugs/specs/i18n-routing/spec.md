## MODIFIED Requirements

### Requirement: Neutral English slugs for page routes
Page route slugs SHALL be in neutral English, identical across all locales: `/search`, `/artist/[slug-id]`, `/album/[slug-id]`, `/song/[slug-id]`. The fixed route segments are never translated; the dynamic segment is `<slug>-<id>` as defined by the `catalog-slugs` capability, where the slug is derived from the entity name and is not localized. The locale lives exclusively in the `[locale]` segment.

#### Scenario: Search route is the same in all locales
- **WHEN** a user accesses search in any locale
- **THEN** the route is `/{locale}/search`, not `/{locale}/buscar` or other translated slug

#### Scenario: Artist route uses neutral slug
- **WHEN** a user navigates to an artist profile
- **THEN** the route is `/{locale}/artist/{slug-id}`, not `/{locale}/artista/{slug-id}`

#### Scenario: Entity slug is identical across locales
- **WHEN** the same artist is opened in `/es` and in `/en`
- **THEN** the dynamic segment is the same `<slug>-<id>` in both locales
