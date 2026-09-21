## Context

Estado actual de la curaduría del perfil, con lo que se comprobó en el código:

- **Tarjeta de Identidad** (`IdentityCard`, `OwnerIdentityCardEditor`): 3 slots (artista, álbum, canción) guardados como referencias directas en `user_showcase` (`defining_artist_id`, `defining_release_group_id`, `anthem_recording_id`). Su editor aplica cada cambio al instante y vive en modo edición y en `/me/settings/profile`.
- **Destacados** (`user_pinned_item`, `PinnedShowcase`, `OwnerShowcaseEditor`): hasta 4 ítems mezclados con orden y nota (≤120). **No tienen audiencia** (visibles con el perfil) y la API no exige que sean favoritos. El editor, además, aloja una sección "Himno" (mismo endpoint que el slot canción de la Tarjeta) y una ★ por ítem que llama a `/api/me/profile/pinned/defining`; `generalPinned` oculta del muro lo que coincide con la Tarjeta.
- **Álbumes favoritos** (`user_album_pin`, `AlbumFavorites`, `OwnerAlbumFavoritesEditor`): hasta 6 pines *sobre `favorite`* con orden manual y audiencia heredada del favorito. Mismo patrón ★ + exclusión (`generalAlbums`). Lo alimenta también el onboarding (`seedAlbumFavorites`) y lo cuenta `apply-audience` (`pinnedAlbumFavorites`).
- **Favoritos** (`FavoritesPreview`): fila de álbumes con los 5 favoritos más recientes y enlace a `/users/[username]/favorites`.

La spec `profile-showcase` también define la Tarjeta de Identidad, por eso ese requisito se reescribe ahí y no se traslada.

## Goals / Non-Goals

**Goals:**
- Cada decisión de identidad tiene un único editor; sin ★ ni Himno duplicado.
- Un solo lugar del perfil para los álbumes favoritos (Favoritos).
- "Empieza por aquí" con propósito propio y la nota siempre visible.
- Cero pérdida de datos salvo el orden manual de los álbumes fijados.

**Non-Goals:**
- Cambiar el modelo de `user_pinned_item` (tope, tipos, orden, largo de nota, ausencia de audiencia).
- Tocar la Tarjeta de Identidad, sus endpoints, valoraciones destacadas, listas fijadas o diario destacado.
- Reordenar o "fijar" favoritos.

## Decisions

### D1. Reformular Destacados en el sitio, sin tocar el modelo

Se conservan `user_pinned_item`, `PUT/DELETE /api/me/profile/pinned`, `PinnedShowcase`, `OwnerShowcaseEditor` y los nombres internos (`pinned`). Cambian el nombre visible ("Empieza por aquí" / "Start here"), la presentación y el copy del editor.
*Alternativas:* tabla o rutas nuevas (`user_recommendation`) → churn y migración de datos sin ganancia; el modelo ya cubre el propósito. Renombrar el código a `StartHere*` → diff grande sin valor para el usuario; el nombre de producto vive en i18n y en las specs.

### D2. La nota es opcional pero es el centro de la tarjeta

Requerirla invalidaría los destacados existentes (ninguno tiene nota garantizada) y bloquearía guardar hasta que la escriban. En su lugar:
- **Perfil:** cada ítem es una tarjeta (carátula/placa, título, artista) y, si hay nota, el texto de la nota debajo del artista, sin recorte (≤120). Un ítem sin nota se dibuja igual, sin marcador de "falta nota".
- **Editor:** el campo de nota deja de ser un `placeholder` chico bajo el título: pasa a ser un campo con etiqueta ("¿Por qué empezar por aquí?") y contador `n/120`.
*Alternativa:* nota obligatoria al guardar → descartada por lo anterior; se puede endurecer después si el uso lo pide.

### D3. Sin exclusión por la Tarjeta de Identidad

`generalPinned` se elimina. Con la ★ fuera, "fijar" y "definir" son decisiones independientes; ocultar un destacado porque coincide con la Tarjeta sería una regla invisible para el dueño. `EditableBlock` usa `pinned.length === 0` como criterio de bloque vacío. Una coincidencia sigue siendo posible y es decisión del dueño.

### D4. El himno y "me define" viven solo en el editor de la Tarjeta

Se borran de `OwnerShowcaseEditor` la sección Himno, `loadRecordingFavorites`, el estado `anthem`/`identityCard` y la ★; de `OwnerAlbumFavoritesEditor` (que se elimina entero) la ★. `Showcase.anthem` (campo de primer nivel) se retira: era el mismo dato que `identityCard.anthem`; `OwnerIdentityCardEditor` ya lee `identityCard` de la respuesta. Los endpoints `PUT/DELETE /api/me/profile/anthem` y `/api/me/profile/pinned/defining` **no cambian**.
*Alternativa:* conservar `anthem` "por compatibilidad" → no hay consumidores externos; mantener dos campos para el mismo dato invita a que diverjan.

### D5. Eliminar `user_album_pin` con una migración

Sin lectores ni escritores tras el cambio, dejar la tabla viva solo mantiene datos huérfanos. Migración `DROP TABLE user_album_pin` (verificar el siguiente número libre; hoy `0037`) y se retira `userAlbumPin` de `src/db/schema.ts`. Lo único que se pierde es el orden manual: los `favorite` de álbum (y su audiencia) no se tocan.
*Alternativa:* dejar la tabla sin uso y borrarla "después" → deuda que nadie recoge, y `apply-audience` seguiría teniendo que decidir si la cuenta.

### D6. Onboarding: favoritos, no pines

`seedAlbumFavorites` conserva la validación (≤6, sin duplicados, álbumes existentes) y el "crear el favorito que falte con la audiencia por defecto", pero deja de fijar y ordenar. El tope 6 pasa a ser una constante del onboarding (`ONBOARDING_MAX_ALBUMS`) porque `PROFILE_MAX_ALBUM_FAVORITES` desaparece. Sigue siendo idempotente y sigue sin crear valoraciones ni diario. `OnboardingResponse` se reduce a `{ onboardedAt }`: el cliente (`TwoDoorOnboarding`) solo espera a que termine.
*Alternativa:* marcar el primer álbum como definitorio → decisión de producto nueva; fuera de alcance.

### D7. Aplicar audiencia por defecto

`apply-audience` deja de contar `userAlbumPin`; `ApplyAudiencePreviewSchema.highlighted.pinnedAlbumFavorites` se elimina y el texto `pinnedHidden` habla solo de listas fijadas. Los favoritos de álbum siguen cubiertos por el conteo de `favorites`.

### D8. Curaduría y modo edición

`/me/settings/curation` queda con: Empieza por aquí (editable, `n/4`), listas fijadas, valoraciones destacadas y diario destacado. Los controles de edición del perfil quedan: Placa, Tarjeta de Identidad y Empieza por aquí. El resumen (`getCurationSummary`) no cambia; `showcase.pinned.length` ya alimenta el conteo.

### D9. Presentación visual: mockups antes de código (resuelto)

El diseño de la tarjeta de "Empieza por aquí" es una decisión visual y este proyecto las resuelve con mockups estáticos sobre los tokens reales (ver memoria `profile-redesign`). Se presentaron tres variantes (A tarjetas 2×2, B lista con cita, C muro de 4 columnas con nota debajo) y el usuario eligió **B, sin subtítulo**:
- Un ítem por fila, sin cajas, separadas por hairlines (`border-ink-border`); miniatura de 88 px (64 px en anchos < 400 px), y a su derecha etiqueta de tipo (mono, `text-petrol`), título (`font-display`), artista (`font-data`) y, si la hay, la nota como cita: `font-body` cursiva, filete izquierdo ámbar de 2 px, sin recorte.
- Artistas con `ArtistPlate`; canciones con el `CoverThumb` de respaldo (disco de vinilo). Todo el ítem es un enlace a la entidad.
- Solo el encabezado "Empieza por aquí"; sin subtítulo (queda cerrada la Open Question).

### D10. Forma de los deltas de spec

`openspec archive` rechaza un MODIFIED que omita un escenario existente. Donde escenarios dejan de ser válidos se usa REMOVED del requisito + ADDED con nombre nuevo:
- `social-profiles`: "Composición del perfil por nivel de acceso" → "Composición del perfil por niveles de acceso" (el nuevo queda al final del archivo de la spec).
- `profile-showcase`: "Marcar un artista o álbum como definitorio" → "Tarjeta de Identidad del perfil".
Donde todos los escenarios siguen siendo válidos se usa RENAMED/MODIFIED (`profile-showcase`: "Cuatro destacados", `onboarding`: Puerta 1) o MODIFIED (`owner-settings`, `profile-edit-mode`, `profile-identity`, `default-audience`), copiando el requisito completo.

## Risks / Trade-offs

- **[Se pierde el orden manual de álbumes fijados]** → Es el costo aceptado de eliminar la sección; los favoritos siguen y "Empieza por aquí" cubre la curaduría explícita. La migración es destructiva: documentarlo en el commit.
- **[Usuarios con destacados sin nota verán tarjetas "vacías" de texto]** → Se dibujan igual que hoy sin línea de nota; el editor invita a completarla. Si el uso muestra que casi nadie la usa, reabrir D2.
- **[Usuarios cuyo álbum definitorio era también un álbum favorito fijado]** → La Tarjeta guarda una referencia directa, no depende del pin; no cambia nada para ellos.
- **[Cambios de contrato de API]** → Solo los consume el propio cliente web; se actualizan `schemas.ts`, tests y `docs/04-api/contracts.md` en el mismo cambio.
- **[`openspec archive` falla con una spec sin requisitos]** (`profile-album-identity` queda sin ninguno; el validador exige al menos uno) → Ver "Migration Plan".
- **[Otro agente puede haber creado migraciones]** → Verificar el siguiente número libre justo antes de generar la migración.

## Migration Plan

1. Rama `feature/simplify-profile-curation` desde `main` (ya creada).
2. Implementar en este orden: servicios y esquemas → migración → UI → i18n → tests → docs (ver `tasks.md`).
3. Verificar `typecheck`, `lint`, `test` y `build` con el servidor de desarrollo parado (correr `next build` con el dev server activo corrompe `.next`).
4. Aplicar la migración en la base local y comprobar: los `favorite` de álbum siguen intactos, el perfil no muestra "Álbumes favoritos" y "Empieza por aquí" conserva los ítems y notas existentes.
5. **Archivo:** antes de `openspec archive`, borrar `openspec/specs/profile-album-identity/` y el delta `changes/simplify-profile-curation/specs/profile-album-identity/` (una spec sin requisitos no valida), y archivar el resto; en Windows mover carpetas con `Move-Item` si `mv` da "Permission denied".
6. Tras archivar, corregir los `## Purpose` que mencionan "Álbumes favoritos" (`onboarding`, `profile-showcase`, `profile-in-rotation`, `profile-reviews`).
7. **Rollback:** revertir el merge restaura código y specs, pero la migración es irreversible sobre el orden manual; recrear `user_album_pin` vacía no restaura los pines.

## Open Questions

- ¿Endurecer la nota a obligatoria más adelante? Depende del uso real; por ahora no.
