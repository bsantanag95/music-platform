## Why

La auditoría del 2026-11-16 (`mockups/private-profile-2026-11/`, propuesta A, estados `#limited` y `#empty`) encontró
dos problemas en los perfiles **públicos** cuyo contenido es en parte o del todo solo para seguidores. Cuando todo es
solo para seguidores (`@bsantana`), quien no sigue ve la cabecera y debajo nada: la página parece rota. Cuando es solo en
parte (`@besantanag95000`), nada indica que seguir muestra más. La Fase 1 (`redesign-private-profile-phase1`) resolvió el
perfil privado; esta fase cierra el plan.

## What Changes

- Al final del cuerpo de un perfil público, quien no lo sigue ve un aviso genérico: «Si sigues a @x, verás también lo que
  comparte solo con sus seguidores», con la acción de seguir (o de iniciar sesión para seguir).
- El aviso se muestra a **todo** visitante que no sigue, haya o no contenido oculto: no revela si existe (regla de
  `diary-visibility`).
- Cuando ninguna sección del cuerpo ni de la franja de identidad tiene nada visible para ese visitante, el cuerpo muestra
  en su lugar «Nada público por ahora», con la misma oración y la acción.
- Dueño y seguidores no ven ninguno de los dos.

### Goals

- Que un perfil público con poco visible no parezca roto y diga, sin revelar nada, que seguir puede mostrar más.

### Non-Goals

- Cambiar audiencias, reglas de acceso o API.
- Decir qué secciones o cuántos elementos están ocultos.
- Tocar el perfil privado (Fase 1).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisito nuevo «Aviso para quien no sigue un perfil público».

## Impact

`src/app/[locale]/users/[username]/page.tsx` (sección al final del cuerpo), `sections.tsx` (nueva sección asíncrona),
nuevo servicio `src/services/profiles/visible-content.ts`, nuevo componente `src/components/profiles/FollowersOnlyNote.tsx`,
mensajes `messages/{es,en}/users.json` (`followersNote.*`), `docs/05-features/user-profile.md`. Sin esquema ni API.
