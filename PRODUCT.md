# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are active listeners who want a curated, personal record of their music history — not passive consumers of algorithmic playlists. They enjoy discussing discographies with precision: editions, remasters, collaborations, and the distinction between a solo career and a band's work. The audience ranges from casual listeners to serious physical-format collectors (vinyl, CD, cassette) who care about cataloging their collection with attribute-level detail.

## Product Purpose

A social music cataloging and review web app — "a Letterboxd for music." Users search and browse a real-music-industry-accurate catalog (feats, collaborations, editions, remasters — data sourced on-demand from MusicBrainz and Cover Art Archive), register dual ratings (stars + detailed score) and comments on artists/albums/songs, log their listening history, mark favorites, build curated lists, catalog physical collections, and follow other listeners to passively discover what they're listening to. Success means a growing community where the catalog expands organically through real use, not wholesale import.

## Positioning

Subjectivity is the product. Ratings are expressions of identity and social comparison, not objective quality scores (explicitly contrasted with Metacritic's aggregate model). The mechanism a neighbor cannot easily copy: a dual-rating system (0.5–5 stars + optional 1–100 detailed score, DB-enforced coherence) combined with presence-first philosophy — logging a listen has zero friction and requires no judgment; rating and commenting are separate, deliberate, optional layers. The social graph is explicit and follow-based (unilateral, with approval optional), not algorithmic.

## Operating Context

The canonical user flow is: search for an artist → view their discography (with band/person memberships, e.g. Pink Floyd ↔ Roger Waters) → navigate to an album → rate a song → mark it as listened → see it appear in the activity feed. Users return to check what people they follow are listening to, manage their lists and collection, and refine ratings over time. The app runs in the browser with no native client; the PWA shell is planned (Fase 6) but not yet shipped. Two user languages: Spanish (default) and English, switchable per session.

## Capabilities and Constraints

**Implemented (Fases 1–5):**
- Catalog browsing: search by artist name, artist profile with discography and memberships, album detail with tracklist/editions/credits, song detail with cross-album appearances and variant types (original / re-recording / remix / live)
- On-demand data ingestion from MusicBrainz (metadata) and Cover Art Archive (250px thumbnails only — licensing constraint, not optimization)
- Authentication: local registration/login with argon2 password hashing, Google OAuth 2.0 + OIDC (PKCE + state + nonce), session management with rotation and revocation
- Dual ratings on artist/album/song (stars 0.5–5 + detailed 1–100, DB-enforced coherence)
- Comments on artist/album/song (multiple per user, physical delete)
- Listening diary with context (first listen / relisten / rediscovery), reactions, private notes, audience controls
- Favorites toggle on artist/album/song with audience controls
- Curated single-entity-type lists with manual ordering and audience
- Physical collection cataloging (vinyl/CD/cassette/other) with 17 closed-attribute vocabulary + free note
- User profiles with public/private visibility
- Follow/unfollow (unilateral), follow-request approval/rejection, blocking
- Activity feed (follow-based): listens, favorites, list events, ratings, comments

**Explicitly not built (anti-features):**
- No music player or audio playback
- No audio source with streaming licenses; no third-party copyrighted audio uploads
- No algorithmic "for you" recommendations in early phases (discovery is social, not algorithmic)
- No gamification or pressure mechanics (streak counts, pending-to-rate backlogs, completion medals)

**Technical constraints:**
- PostgreSQL database with hand-written SQL migrations (never edited after applied; new changes in new files)
- `mbid` (MusicBrainz ID) as unique column for idempotent upserts
- `updated_at` maintained by DB trigger only — never set from app code
- All route handlers wrapped in `with-error-handling` for uniform `{ error, code }` responses
- Next 15 `params` as `Promise<{ id: string }>` — `await params` mandatory in all dynamic routes
- No new dependencies without explicit justification

**Open decisions:**
- Product name: "music-platform" is a working title; final name TBD
- PWA manifest, service worker, and offline shell (planned Fase 6)
- Automatic scrobbling (planned Fase 6)

## Brand Commitments

- Working title: "music-platform" (provisional, may change without structural cost)
- Placeholder logo: "♪" glyph in amber rounded square — generic until an official logo is created
- Tagline (ES): "Catalogá lo que escuchaste. Un Letterboxd para música."
- Tagline (EN): "Catalog what you listened to. A Letterboxd for music."
- Codebase and documentation written in Spanish; product served in Spanish (default) and English

## Evidence on Hand

- Extensive documentation in `/docs/` (product vision, PRD, domain model, business rules, architecture, ADRs, API contracts, feature specs, data licensing)
- Design token system in `src/app/globals.css`: warm-dark palette (ink/paper/amber/petrol), three typefaces (Space Grotesk for display, Source Serif 4 for body, IBM Plex Mono for data/labels)
- Placeholder logo component at `src/components/layout/Logo.tsx`
- No public/ folder, no favicon, no SVG brand assets committed yet

## Product Principles

1. **Presence ≠ Criterion.** Logging a listen should have zero friction and require no judgment. Rating and commenting are separate, deliberate, optional layers.
2. **Subjectivity is the product.** Ratings are expressions of identity and social comparison, not objective quality scores.
3. **Explicit social graph.** Follow-based, not algorithmic. Discovery happens through people you chose to follow, not through recommendation engines.
4. **Growth through real community use.** The catalog grows on-demand, never pre-loaded wholesale. Each artist enters the database because someone looked for them.
5. **No gamification pressure.** No streaks, no pending backlogs, no completion medals. The product respects the user's relationship with music.

## Accessibility & Inclusion

- Visible focus outlines always present (not just on keyboard navigation)
- `prefers-reduced-motion` support throughout
- No product-specific WCAG level formally declared; current implementation follows best-practice patterns (semantic HTML, ARIA labels, keyboard navigability)
