## 1. Datos

- [x] 1.1 `drizzle/0097_profile_tone.sql`: `user_showcase.profile_tone text` con `CHECK` de formato hex
- [x] 1.2 Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`

## 2. Cálculo

- [x] 2.1 `src/services/profiles/tone.ts`: `toneFromImage(bytes)` (histograma de matices, saturación mínima, luminosidad fija, contraste ≥ 3:1) y `refreshProfileTone(userId)` con `fetchImageBytes` (si la carátula no se puede descargar, el tono no cambia)
- [x] 2.2 `clearDefiningEntity("release-group")` borra el tono; la ruta `PUT /api/me/profile/pinned/defining` agenda `refreshProfileTone` con `after()` al elegir un álbum
- [x] 2.3 `getProfileTone(ownerId)` con `cache()`
- [x] 2.4 Tests: tono de una imagen roja/azul sintética, gris → `null`, oscura → aclarada hasta 3:1, borrado al quitar el álbum, ruta que agenda el cálculo

## 3. Aplicación

- [x] 3.1 `page.tsx`: `--profile-tone` en el perfil accesible, ámbar por defecto
- [x] 3.2 `ProfileHeader` (línea inferior y comillas) y `ProfileAnchors` (sección activa) con el tono
- [x] 3.3 `IdentityCard`: vinilo detrás del álbum y el himno; hover/focus, táctil quieto, movimiento reducido; tests

## 4. Operación, documentación y verificación

- [x] 4.1 `scripts/backfill-profile-tone.ts` (idempotente, `--dry-run`) y su entrada en `docs/06-operations/catalog-scripts.md`
- [x] 4.2 `docs/05-features/user-profile.md`: tono y vinilo
- [x] 4.3 Aplicar `0097` y correr el script en la BD de scratch (5 perfiles: 4 con tono, 1 en ámbar; segunda corrida sin cambios)
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.5 Verificación en el navegador a 1440 y 375 px: tono de @besantanag95 (`#d88d6e`) en la línea, las comillas, la sección activa y la etiqueta; vinilo sobre el vecino con el cursor; quieto y asomado en táctil, sin desborde (el foco con teclado queda cubierto por los tests de clases)
