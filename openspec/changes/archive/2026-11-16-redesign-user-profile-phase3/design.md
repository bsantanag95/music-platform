## Context

El álbum definitorio se guarda en `user_showcase.defining_release_group_id` vía `setDefiningEntity` (ruta
`PUT /api/me/profile/pinned/defining`) y se quita con `clearDefiningEntity` (`DELETE`). Su carátula es la miniatura del
catálogo (`release_group.cover_thumb_url`): ruta del espejo propio (`/uploads/...` o el dominio del storage) o Cover Art
Archive `front-250`. `src/services/share/images.ts` ya expone `fetchImageBytes`, que lee esas fuentes con lista de hosts
permitidos, tope de tamaño y timeout, y `sharp` ya es dependencia. El perfil (Fases 1 y 2) usa ámbar fijo en la marca de
la sección activa (`ProfileAnchors`) y en las comillas de la bio (`ProfileHeader`).

Referencia: `mockups/profile-2026-11/d2-personalidad.html` (controles «Tono», «·Ratt», «·Dokken» y `#disco`).

## Goals / Non-Goals

**Goals:** tono guardado y calculado una vez; contraste ≥ 3:1 sobre la tinta; vinilo accesible (teclado, táctil, movimiento
reducido) y sin desborde a 390 px.

**Non-Goals:** tono elegido a mano; tono fuera del perfil; recalcular al cambiar la carátula del catálogo (el script lo
cubre si hace falta); giro del avatar.

## Decisions

### Algoritmo (`src/services/profiles/tone.ts`, puro y testeable)
`sharp(bytes).resize(48, 48, { fit: "cover" }).removeAlpha().raw()` → por píxel, HSL; se ignoran los casi negros
(L < 0,12) y casi blancos (L > 0,92); 12 sectores de matiz con peso `s²`; el sector de mayor peso da el matiz (promedio
circular de sus píxeles) y su saturación media. Peso total < 20 o saturación < 0,18 → `null` (ámbar). Tono:
`hsl(h, max(s, 0,5), 64 %)`, convertido a hex; si su contraste con `#14120f` es < 3:1, se sube L en pasos de 2 % hasta
llegar (tope 80 %). Es el mismo cálculo validado en el mockup con Rise, Ratt y Tooth and Nail. *Alternativa descartada:*
promedio de color — da marrones apagados (probado en el mockup).

### Cuándo se calcula
`refreshProfileTone(userId)` lee el álbum definitorio y su carátula, calcula y guarda (`profile_tone` o `NULL`). La ruta
`PUT`/`DELETE` lo agenda con `after()` de `next/server`: no demora la respuesta ni el editor; si falla (red, imagen), se
registra y el tono queda como estaba (o `NULL` si se quitó el álbum, que se borra de forma síncrona en
`clearDefiningEntity`). Un cambio de artista o himno no lo dispara.

### Datos
`ALTER TABLE user_showcase ADD COLUMN profile_tone text` con `CHECK (profile_tone IS NULL OR profile_tone ~ '^#[0-9a-f]{6}$')`
(migración `0097_profile_tone.sql`). Espejo en `schema.ts`; `docs/03-data/sql-model.md`. Lectura: `getProfileTone(ownerId)`
en `showcase.ts`, envuelta en `cache()`.

### Aplicación
`page.tsx` lee el tono y pone `--profile-tone` en el `<main>` del perfil accesible (fallback `var(--color-amber)`).
`ProfileHeader`: línea inferior (`box-shadow` inset de 2 px con el tono al 70 %) y comillas de la bio. `ProfileAnchors`:
`border-[var(--profile-tone,var(--color-amber))]` en la activa. `IdentityCard`: etiqueta del vinilo. Nada más usa el tono.

### Vinilo
En `IdentityCard`, el álbum y el himno envuelven la carátula en una funda `relative`; detrás, un disco (`absolute inset-[4%]`,
surcos con `repeating-radial-gradient`, etiqueta central con el tono) `aria-hidden`. Hover/focus-visible del enlace:
`translateX(36%) rotate(40deg)` y el `li` sube de capa (`z-10`) para pasar por encima del vecino. `@media (hover: none)`:
`translateX(14%)` fijo. `motion-reduce:transition-none`. El `ul` no recorta: el disco asoma hacia el hueco y el vecino; el
último elemento (himno) asoma dentro del contenedor de la cabecera, que ya tiene `overflow-hidden` — se verifica a 390 px.

## Risks / Trade-offs

- [Carátula que cambia después (espejo, takedown)] → el tono queda viejo hasta el próximo cambio de álbum o el script;
  aceptable: es un acento, no un dato.
- [Fetch en `after()` en serverless] → `after()` está soportado en Next 15; si no corre, el perfil usa ámbar.
- [Tonos chillones] → saturación mínima 0,5 y luminosidad fija acotan el resultado; el contraste mínimo evita tonos oscuros.

## Migration Plan

Aplicar `0097` (`pnpm run db:migrate`), desplegar y correr `npx tsx --env-file=.env scripts/backfill-profile-tone.ts`
(idempotente, `--dry-run` disponible). Revertir el código deja la columna sin uso; no hace falta revertir la migración.
