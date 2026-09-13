## Context

`want-to-listen` exposes a genuine toggle at `POST /api/me/want-to-listen`
(`toggleWantToListen`): if the target is already in the list it removes it, if absent it
creates it. `WantToListenButton` (catalog pages) is safe to call blindly because it always
shows the current state (`initialActive` hydrated server-side, then the local `active` state
after each click) — the button label always matches what will happen next.

The diary row's "···" menu is different: it is a *fire-and-forget* menu (same shape as
"Registrar otra escucha"/"Agregar a lista"), not a persistent toggle button. It has no
per-row "is this already in Want to Listen?" state today, and fetching it (to show a
state-aware label) would mean a new per-entry query.

## Goals / Non-Goals

**Goals:**
- Let the user mark "want to relisten" straight from a diary row, for artist/album entries.
- Never let a second click on an already-marked target silently remove it without the user
  noticing.

**Non-Goals:**
- Showing the current Want to Listen state in the menu label (would require a new per-entry
  query or widening `listMyDiary`'s response shape — out of scope for a quick action).
- Any change to the `want-to-listen` API contract, service, or the catalog-page button.

## Decisions

### D1. Reuse the existing toggle endpoint as-is
Alternative considered: add a dedicated idempotent "ensure present" endpoint/service function
that never removes, so the diary menu item could safely be called any number of times.
Rejected for now — it would add a second write path for the same table alongside the
established toggle, for a UI surface (a quick-action menu) that already tolerates a toggle
elsewhere in the app (`WantToListenButton`). Revisit only if product wants the diary menu
item to show live state instead of a result announcement.

### D2. Announce the actual result instead of hiding the toggle risk
Because the same click can add or remove depending on prior state, the row gets a transient
amber flash (same mechanism as the existing "changes saved" confirmation) plus an
`aria-live="polite"` announcement reading either "Se agregó..." or "Se quitó..." based on the
toggle response (`entry !== null` → added). This makes the toggle's dual behavior legible
instead of surprising, without needing to know the prior state up front.

### D3. Same target-type restriction as `want-to-listen`
The menu item is omitted entirely for `recording` targets (songs), mirroring the scope
restriction already enforced server-side by `want-to-listen` — no new validation needed
client-side beyond hiding the option.

## Risks / Trade-offs

- **[Risk] A user could click the item twice in quick succession without reading the
  announcement, ending up in the opposite state from what they intended** → Mitigation:
  same risk already exists for `WantToListenButton` itself; the announcement plus the amber
  flash mitigates it enough for a quick action, and the row menu closes on each selection
  (`RowMenu` auto-closes), which slows down accidental double-firing.

## Migration Plan

No data or contract migration. Purely additive UI change; no rollback concerns beyond
reverting the component edit.

## Open Questions

None.
