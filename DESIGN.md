---
name: Music Platform
description: Catalog what you listened to. A Letterboxd for music.
colors:
  primary: "#e8b84b"
  primary-hover: "#f2c866"
  secondary: "#4a7c7c"
  secondary-hover: "#5b9494"
  danger: "#d96c5f"
  ink: "#14120f"
  ink-surface: "#1f1b17"
  ink-border: "#2e2a24"
  paper: "#f2ede4"
  paper-muted: "#a89e8e"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontWeight: 500
  body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontWeight: 400
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "display"
  button-secondary-hover:
    borderColor: "{colors.primary}"
  button-ghost:
    textColor: "{colors.paper-muted}"
  input:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    borderColor: "{colors.ink-border}"
    padding: "8px 12px"
  input-focus:
    borderColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.ink-surface}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.ink-border}"
    padding: "12px"
  card-hover:
    borderColor: "{colors.primary}"
  nav-breadcrumb:
    textColor: "{colors.paper-muted}"
    typography: "label"
  nav-breadcrumb-current:
    textColor: "{colors.paper}"
  nav-breadcrumb-hover:
    textColor: "{colors.paper}"
---

# Design System: Music Platform

## Overview

**Creative North Star: "The Vinyl Listening Room"**

Warm, quiet, deliberate, tactile. The interface treats music as a material culture — something held, studied, and discussed with care. The entire system is a darkened listening room: an ink-warm near-black as the walls, paper-warm text as lamplight, and the amber glow of a VU meter as the single accent that draws the eye when a decision or interaction asks for attention. There is no noise here, no decorative motion, no gratuitous gradient — every element earns its place by helping you read, rate, and discuss a discography with the precision a serious listener expects.

Two layers of material character coexist deliberately. The **interactive chrome** — buttons, inputs, navigation — stays quiet, refined, and minimally visible; it is furniture, not decoration. The **content surfaces** — album cards, cover art, the disc placeholder, list entries — carry the tactile, object-like quality of the physical collection: a vinyl sleeve held up to the light. This separation is what keeps a data-dense cataloging tool from feeling cold, without ever letting the interface compete with the music itself.

**Key Characteristics:**
- Warm-dark material environment; never pure black, never pure white — always earth-tinted paper and ink
- A single, disciplined amber accent used sparingly across the whole screen (focus rings, primary actions, active states)
- Flat, tonal depth system: surfaces layer by temperature, never by shadow
- Editorial typography triad: a grotesque for display, a serif for reading, a monospace for data
- Chosen interaction furniture begets a "listening room" hushed calm
- Respects `prefers-reduced-motion`; visible focus outline always on

## Colors

The palette is a warm, darkened material world — ink-toned grounds with paper-warm text and two accents drawn from the analog hi-fi era: a VU-meter gold and a vintage teal. No color in the system is fully saturated to its pure hue; everything sits a few degrees toward the warm/brown and slightly muted, so the interface reads as lit, not glowing.

> **Naming layers.** Every color in this system has three names: a **role** (used in this doc's frontmatter — `primary`, `secondary`), a **CSS variable** (the technical identifier defined in `globals.css` — `--color-amber`), and a **display name** (the creative name used in prose — "VU Gold"). The CSS variable is the source of truth; role and display name are human-readable layers on top of it. See `design-tokens-naming.md` for the full mapping and the resolution of the `--color-accent` duplicate.

### Primary
- **VU Gold** (#e8b84b) — role: `primary` · CSS: `--color-amber`: The single accent of the system. Used for focus outlines (always visible, 2px), primary action buttons, the logo mark, active rating selections, and hover borders on cards. Gold is accuracy, warmth, and the point. Its rarity is its power.
- **VU Gold Hover** (#f2c866) — role: `primary-hover` · CSS: `--color-amber-hover`: A brighter lift on the primary accent for hover/pressed states.

### Secondary
- **Vintage Teal** (#4a7c7c) — role: `secondary` · CSS: `--color-petrol`: A low-luminance teal evoking vintage hi-fi. Used for secondary status signals — success notices (`text-secondary-hover`), and reserved, rare emphasis where gold would shout.
- **Vintage Teal Hover** (#5b9494) — role: `secondary-hover` · CSS: `--color-petrol-hover`: Brighter teal for hover states on teal elements.

### Neutral
- **Ink** (#14120f) — role: `ink` · CSS: `--color-ink`: The page background — warm near-black, never `#000`. All surfaces rest on it.
- **Vinyl Surface** (#1f1b17) — role: `ink-surface` · CSS: `--color-ink-surface`: One step lighter — cards, inputs, comment bubbles, elevated containers.
- **Groove Line** (#2e2a24) — role: `ink-border` · CSS: `--color-ink-border`: Borders and dividers — a fine, warm hairline, like a groove on the record face.
- **Paper** (#f2ede4) — role: `paper` · CSS: `--color-paper`: Primary text — warm off-white, "paper" lamplight tone.
- **Aged Linen** (#a89e8e) — role: `paper-muted` · CSS: `--color-paper-muted`: Secondary text — muted warm gray for labels, metadata, placeholder, breadcrumbs.

### Tertiary
- **Wax Seal** (#d96c5f) — role: `danger` · CSS: `--color-danger`: Danger and errors. A desaturated, warm red — used for destructive actions, error text, invalid field borders.

### Named Rules
**The Rarity Rule.** VU Gold appears on ≤10% of any given screen. Its power comes from being the only thing that glows in the dark. When everything is amber, nothing is.
**The No-Black Rule.** Never use pure `#000`, pure `#fff`, or the default Tailwind palette. Every color here is earth-tinted; the warmth is the identity.

## Typography

**Display Font:** Space Grotesk (with system-ui fallback)
**Body Font:** Source Serif 4 (with Georgia fallback)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** A restrained editorial triad. Space Grotesk's confident, slightly idiosyncratic grotesque owns headings and buttons; Source Serif 4 carries reading with typographic warmth; IBM Plex Mono marks data, metadata, and status in a way that feels plucked from a studio console or a label's pressing sheets.

### Hierarchy
- **Display** (500, `text-2xl`-`text-3xl`, tight): Page titles — artist names, section headings. Largest display usage is restrained to page-level titles.
- **Headline** (500, `text-xl`): Section headings (`ratingHeading`, `commentsHeading`, `communityActivityTitle`).
- **Title** (400, `text-sm`-`text-base`): Card titles (album names), interactive labels.
- **Body** (400, `text-sm`-`text-base`, ~65ch max): Reading text — comments, descriptions, paragraphs.
- **Label** (400, `text-xs`, uppercase on locale switcher): Metadata, breadcrumbs, field labels, timestamps, member periods, reaction badges, data readouts.

### Named Rules
**The Typographic Division of Labor Rule.** Display speaks, body reads, mono measures. Headings and buttons are always Space Grotesk; paragraphs and comments are always Source Serif; any data — dates, ratings, member roles, breadcrumbs, field labels, locale toggles — is always IBM Plex Mono. Do not swap these roles for flourish.

## Layout

A single centered-column composition: every page is a flex column (`items-center` / `items-start` with `px-4 py-12`) running down a `min-h-screen` main. Readable column widths (`max-w-xl`, `max-w-md`, `max-w-3xl`) keep catalog and social content on comfortable measure; the global `Header` runs full-width with `border-b border-ink-border` and `px-4 py-3`, separating content navigation (left) from session/lang controls (right) — the "who am I" cluster always sits at the far end, Letterboxd-style.

Vertical rhythm is a consistent step — components stack with `gap-4` (16px) between items, `gap-8` (32px) between page regions, and `py-12` (48px) page padding. Forms and detail groups use `flex flex-col gap-4`/`gap-5`. The layout never deviates from a warm-dark ground broken only by hairline `ink-border` dividers; there are no layout shadows, no floating panels — just stacked surfaces on the ink field.

## Elevation & Depth

**Purely tonal.** This system uses no shadows at all — depth is conveyed entirely through background temperature stepping: `ink` (#14120f) → `ink-surface` (#1f1b17) → `ink-border` (#2e2a24). A card is the same flat plane as the page, just one warm step lighter, separated by a hairline border. This is a deliberate flatness, the flatness of printed matter and a label's sleeve — not a spare, cold dashboard, but a tactile, held object.

Surfaces stack by lightness, not by lifting. There is exactly one ground, one surface, and one boundary line; nothing floats above anything else. Interaction feedback is expressed through border and text-color shifts (borders turning to VU Gold on hover/focus), never through elevation.

### Named Rules
**The No-Shadow Rule.** Elevation is never a box-shadow. If you need to separate a surface, step it one temperature lighter (`ink-surface`) and draw a `ink-border` hairline around it — never cast a drop shadow. The listening room is lit by lamps, not by false depth.

## Shapes

A softly rounded form language, small and unassertive. The radius scale is tight — `4px` (sm), `6px` (default/`rounded`), `10px` (lg) — used for buttons, inputs, cards, and the logo mark. Corners are gently curved, never pill-shaped, never sharp-edged. This keeps interactive and content elements warm and approachable without veering into playful.

Two recurring "disc" silhouettes carry the object metaphor: the **Skeleton** `disc` variant and the **DiscPlaceholder** both render a vinyl record as concentric hairline circles (`inset-[15%]`, `inset-[35%]` borders + `inset-[48%]` filled center) — the tactile object-memory of the collection. Cover art is always square (`aspect-square`), echoing the album sleeve.

## Components

Interactive chrome is quiet and minimally weighted; content surfaces carry the object-like tactility. Both share the same small, warm-cornered, hairline-bordered language.

### Buttons
- **Shape:** Gently curved corners (6px), tight padding (`px-4 py-2`), Space Grotesk medium `text-sm`.
- **Primary:** VU Gold background, ink text, hover lifts to VU Gold Hover. The system's one confident action.
- **Secondary:** Vinyl Surface background, paper text, Groove Line border, hover border shifts to VU Gold. Used for follow, reject, load-more, search-again.
- **Ghost:** Aged Linen text, hover to paper. Used for navigation links and quiet actions.
- **Hover / Focus:** Background/border color transitions only (`transition-colors`), inherited amber focus outline. Disabled states drop to `opacity-50` with `cursor-not-allowed`.

### Inputs & Fields
- **Style:** Vinyl Surface background, Groove Line border, gently curved corners (6px), paper text, Aged Linen placeholder.
- **Focus:** Border shifts to VU Gold on `:focus-visible` (plus the always-on 2px amber outline).
- **Error:** Border shifts to Wax Seal; error message in `text-danger` below the field (`aria-describedby` wiring).
- **Labels:** IBM Plex Mono `text-sm`, Aged Linen, above the field.

### Cards / Containers
- **Corner Style:** Gently curved (10px, `rounded-lg`).
- **Background:** Vinyl Surface (`ink-surface`).
- **Border:** Groove Line hairline; **hover** border shifts to VU Gold.
- **Shadow Strategy:** None — purely tonal.
- **Internal Padding:** `p-3` (12px) for album cards, `p-4` (16px) for comment bubbles, `px-6 py-12` for empty states.

### Navigation
- **Style:** A full-width bordered header (`border-b border-ink-border`), IBM Plex Mono `text-sm` links in Aged Linen, hover to paper. Locale switcher is `text-xs uppercase`; active locale is paper, inactive is Aged Linen. The user's name sits at far right with hover to VU Gold.

### Signature: Disc / Record
- The vinyl placeholder and disc skeleton — concentric hairline circles with a filled center — appear anywhere imagery is missing (artist photos, covers, loading states). It is the system's most recognizable recurring object: a record, not an empty box.

## Do's and Don'ts

### Do:
- **Do** keep the amber accent rare and disciplined — it is the one light in the room.
- **Do** express depth by stepping background temperature (ink → Vinyl Surface) and drawing Groove Line hairlines, never with box-shadows.
- **Do** honor the typographic division of labor: Space Grotesk for display, Source Serif for body, IBM Plex Mono for data and labels.
- **Do** keep cover art square and surfaces gently curved (4–10px), never pill-shaped.
- **Do** respect `prefers-reduced-motion` and always keep the 2px amber focus outline visible.

### Don't:
- **Don't** use pure `#000`, pure `#fff`, or the default Tailwind palette — warmth is the identity.
- **Don't** add decorative shadows, gradients, or motion that competes with content.
- **Don't** render audio imagery as empty rectangles — use the disc/record silhouette when art is missing.
- **Don't** let any secondary color (teal, danger) shout louder than VU Gold; it owns visual emphasis.
- **Don't** introduce pill-shaped or fully sharp corners; stay in the 4–10px radius language.
