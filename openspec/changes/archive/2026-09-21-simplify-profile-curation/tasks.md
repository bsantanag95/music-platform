## 1. Preparación

- [x] 1.1 Confirmar que la rama es `feature/simplify-profile-curation` y que el árbol de trabajo no trae cambios ajenos (si los hay, `git stash` y avisar; no commitearlos)
- [x] 1.2 Mockups de la tarjeta de "Empieza por aquí" presentados; el usuario eligió la variante **B (lista con cita), sin subtítulo** (design D9)

## 2. Servicios, esquemas y base de datos

- [x] 2.1 `src/services/profiles/showcase.ts` y `src/lib/api/schemas.ts`: retirar `anthem` de primer nivel de `Showcase`/`ShowcaseSchema` (queda `identityCard.anthem`); confirmar que `/api/me/profile/pinned` y `/api/me/profile/anthem` responden sin él y que `showcase.test.ts` y los tests de las rutas siguen verdes
- [x] 2.2 `src/services/onboarding/onboarding.ts`: `seedAlbumFavorites` pasa a solo crear los `favorite` de álbum que falten (sin fijar ni ordenar), conserva validaciones (≤6, sin duplicados, álbumes existentes) y usa `ONBOARDING_MAX_ALBUMS = 6` en lugar de `PROFILE_MAX_ALBUM_FAVORITES`; `OnboardingState`/`OnboardingResponseSchema` quedan en `{ onboardedAt }`; ajustar `completeOnboarding` (ya no lee pines) y `OnboardingRequestSchema`
- [x] 2.3 Ajustar `src/app/api/me/onboarding/route.ts` (comentarios), `src/lib/api/onboarding.ts` y `TwoDoorOnboarding`/`AlbumIdentityPicker` (textos y tipos; el cliente ya ignora el cuerpo de la respuesta)
- [x] 2.4 `src/services/social/apply-audience.ts`: quitar el conteo de `userAlbumPin` y `pinnedAlbumFavorites`; retirarlo de `ApplyAudiencePreviewSchema` y de `DefaultAudienceSettings.tsx` (el aviso `pinnedHidden` habla solo de listas fijadas)
- [x] 2.5 Eliminar `src/services/profiles/album-favorites.ts` (+ test), `src/app/api/me/profile/album-favorites/` (+ test) y de `schemas.ts` `AlbumFavoriteSchema`, `AlbumFavoritesResponseSchema`, `ReplaceAlbumFavoritesRequestSchema`; retirar `PROFILE_MAX_ALBUM_FAVORITES` de `src/services/social/types.ts`; actualizar el comentario de `rating-highlights.ts` que cita `getProfileAlbumFavorites`
- [x] 2.6 Verificar el siguiente número libre en `/drizzle/` (hoy el último es `0037`) y crear `NNNN_drop_user_album_pin.sql` a mano (`DROP TABLE user_album_pin`, sin `drizzle-kit generate`); retirar `userAlbumPin` y `UserAlbumPinRow` de `src/db/schema.ts`; actualizar `docs/03-data/sql-model.md` (sección `user_album_pin`)
- [x] 2.7 `npm run typecheck` sin errores tras retirar todos los usos de lo eliminado

## 3. Interfaz del perfil y de ajustes

- [x] 3.1 `PinnedShowcase`: reescribir según el mockup elegido (nota completa a la vista, artista con `ArtistPlate`, sin recorte de nota); eliminar `generalPinned` y la comparación con la Tarjeta; encabezado "Empieza por aquí"
- [x] 3.2 `OwnerShowcaseEditor`: quitar la sección Himno (`anthem`, `chooseAnthem`, `clearAnthem`, `loadRecordingFavorites`, `recordingFavorites`), la ★ (`setDefining`, `isDefiningEntity`, `identityCard`, `definingErrorCode`) y sus imports; convertir la nota en un campo con etiqueta "¿Por qué empezar por aquí?" y contador `n/120`; el guardado sigue siendo un único `PUT`
- [x] 3.3 `sections.tsx` y `page.tsx`: eliminar `AlbumFavoritesSection` y su uso; `PinnedSection` usa `pinned.length === 0` como criterio de vacío en `EditableBlock` y ya no depende de `identityCard`
- [x] 3.4 Eliminar `AlbumFavorites.tsx`, `OwnerAlbumFavoritesEditor.tsx` y sus tests
- [x] 3.5 `src/app/[locale]/me/settings/curation/page.tsx`: quitar las filas Himno y Álbumes favoritos y las cargas de `getAlbumFavorites`; la fila "Empieza por aquí" muestra `n/4` y abre el editor en el panel lateral
- [x] 3.6 Etiqueta del lápiz del bloque en modo edición ("Empieza por aquí") y ausencia de lápiz de álbumes favoritos (spec `profile-edit-mode`)
- [x] 3.7 `messages/{es,en}/users.json`: renombrar `showcase.pinnedHeading` ("Empieza por aquí" / "Start here") y copys del editor (`showcase.edit.*`), retirar `albumFavorites.*`, `settings.curation.anthem`, `settings.curation.albumFavorites`, `settings.…apply…pinnedAlbumFavorites` y ajustar `pinnedHidden`; retirar también las claves de himno de `showcase.edit.*` que queden sin uso

## 4. Pruebas

- [x] 4.1 Actualizar `sections.test.tsx`, `page.test.tsx`, `settings.test.tsx`, `editor-host.test.tsx`, `EditableBlock.test.tsx`, `IdentityCard.test.tsx` y `OwnerIdentityCardEditor.test.tsx` para el perfil sin Álbumes favoritos y sin `showcase.anthem`
- [x] 4.2 Tests de `OwnerShowcaseEditor` (nuevo o ampliado): sin sección Himno ni ★; el campo de nota guarda el texto y respeta 120 caracteres
- [x] 4.3 Tests de `PinnedShowcase`: muestra la nota completa; ítem sin nota sin línea vacía; no excluye lo que coincide con la Tarjeta
- [x] 4.4 Tests de onboarding: crea favoritos de álbum sin pines, idempotente, tope 6, cero álbumes válido, respuesta `{ onboardedAt }`
- [x] 4.5 Tests de `apply-audience` y `DefaultAudienceSettings` sin `pinnedAlbumFavorites`
- [x] 4.6 `npm run lint`, `npm run typecheck` y `npm test` en verde

## 5. Verificación en el navegador

- [x] 5.1 Aplicar la migración en la base local y comprobar con SQL que `favorite` de álbum conserva sus filas y que `user_album_pin` ya no existe
- [x] 5.2 Con el dev server (parar el servidor antes de cualquier `next build` y borrar `.next` si quedó corrupto): perfil propio sin "Álbumes favoritos", "Empieza por aquí" con ítems y notas existentes, modo edición con lápiz solo en Placa, Tarjeta y "Empieza por aquí", editor de Empieza por aquí sin Himno ni ★
- [x] 5.3 `/me/settings/curation` sin filas de Himno ni Álbumes favoritos; `/me/settings/profile` sigue permitiendo elegir el himno
- [x] 5.4 Flujo de onboarding con una cuenta nueva: elegir álbumes → aparecen en Favoritos; y "Aplicar a lo existente" sin mención de álbumes fijados
- [x] 5.5 Vista de visitante (`?preview=1`) y de otra cuenta: "Empieza por aquí" con notas visibles y sin sección de álbumes favoritos duplicada
- [x] 5.6 `npm run build` en verde (con el servidor de desarrollo parado)

## 6. Documentación y specs

- [x] 6.1 `docs/05-features/user-profile.md` (Destacados → "Empieza por aquí", Tarjeta como único editor de himno/álbum/artista, sin Álbumes favoritos), `docs/05-features/onboarding.md` (Puerta 1 crea favoritos, sin `user_album_pin`) y `docs/04-api/contracts.md` (rutas y respuestas cambiadas)
- [x] 6.2 `openspec validate simplify-profile-curation --strict` sin errores
- [x] 6.3 Antes de archivar: borrar `openspec/specs/profile-album-identity/` y `openspec/changes/simplify-profile-curation/specs/profile-album-identity/` (una spec sin requisitos no valida), luego `openspec archive simplify-profile-curation --yes`; si falla por falta de `## Purpose` en alguna spec tocada, añadirlo y reintentar (aborta sin cambios)
- [x] 6.4 Tras archivar: reemplazar el `## Purpose` de `onboarding`, `profile-showcase`, `profile-in-rotation` y `profile-reviews` donde mencionan "Álbumes favoritos" o "los destacados", y comprobar que `openspec validate --specs --strict` sigue en verde
