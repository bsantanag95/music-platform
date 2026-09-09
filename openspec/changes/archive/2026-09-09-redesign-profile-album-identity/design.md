## Context

### Estado actual del perfil

`src/app/[locale]/users/[username]/sections.tsx` compone el perfil por secciones asíncronas
(cada una en su `<Suspense>`). Mecanismos de identidad hoy:

- **4 destacados mixtos** (`user_pinned_item`): artista / álbum / canción, orden explícito,
  nota opcional. Servicio `getShowcase` / `replacePinned`. Editor `OwnerShowcaseEditor`
  (elige de los favoritos del dueño, sin buscador de catálogo — memoria
  `list-detail-scope`). Display `PinnedShowcase`.
- **Himno** (`user_showcase.anthem_recording_id`): una canción.
- **Huella de gusto** (`taste-fingerprint`), **afinidad**, **recency** ("última señal hace
  X" — no es "en rotación").

`favorite` (tabla) ya guarda favoritos de álbum (`favorite.release_group_id`), con
audiencia propia, y `/me/favorites` los presenta agrupados por tipo.

`social-profiles` → "Composición del perfil por nivel de acceso" fija que huella,
destacados, himno y estantes se renderizan solo en niveles autorizado y dueño, y nada de
eso en bloqueo o perfil privado sin autorización.

### La decisión ya tomada (opción B)

"Álbumes favoritos" **no** es una señal nueva de "amo este álbum": reutiliza el favorito
existente. La sección fija hasta 6 de los favoritos de álbum que el dueño ya tiene. Ventaja:
no hay dos lugares donde marcar un álbum como favorito; un álbum en tu identidad
razonablemente ya es tu favorito. Coste aceptado: para ponerlo en la identidad hay que
marcarlo favorito antes.

## Goals / Non-Goals

**Goals:**

- Una sección de identidad cultural liderada por álbumes, curada y ordenada por el dueño,
  distinta de los destacados mixtos.
- Reutilizar `favorite` y el patrón de editor "elegí de tus favoritos".
- Dejarla lista como destino del onboarding de dos puertas.

**Non-Goals:**

- "En rotación", onboarding, rebalanceo de detalle, reseñas destacadas, reorden global del
  perfil, tocar `favorite` / `user_pinned_item` / `user_showcase`.

## Decisions

### D1 — Tabla `user_album_pin` con FK a `favorite`

**Decisión.**

```sql
CREATE TABLE user_album_pin (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    favorite_id  UUID NOT NULL REFERENCES favorite (id) ON DELETE CASCADE,
    position     SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_user_album_pin_favorite ON user_album_pin (user_id, favorite_id);
CREATE UNIQUE INDEX uq_user_album_pin_position ON user_album_pin (user_id, position);
```

- La fila **es un pin de un favorito**, no de un `release_group` suelto — es la
  materialización de "opción B".
- **`ON DELETE CASCADE` desde `favorite`**: quitar el favorito de álbum lo desfija
  automáticamente de la identidad. Es una **feature** ("si ya no es tu favorito, no te
  representa"), no un borde a mitigar.
- `position` 1–6 con CHECK; unicidad de posición por usuario → orden inequívoco.
- El servicio valida además que el `favorite` sea propio y de tipo álbum
  (`release_group_id IS NOT NULL`) antes de fijarlo.

**Alternativa considerada.** `user_album_pin (user_id, release_group_id, position)` +
validar que exista un `favorite`. Rechazada: guardar `release_group_id` reintroduce "dónde
vive la verdad de que este álbum me importa" — la respuesta de opción B es "en `favorite`".
El FK al favorito lo hace explícito y la cascada sale gratis.

**Alternativa considerada.** Reusar `user_pinned_item` con más posiciones / un flag
"identidad". Rechazada: son mecanismos distintos por diseño (D10: tres mecanismos), y
`user_pinned_item` admite tipos mixtos con nota — semántica distinta.

### D2 — Reemplazo del conjunto ordenado completo

**Decisión.** `PUT /api/me/profile/album-favorites` recibe `{ favoriteIds: string[] }`
(0–6, ordenados). El servicio `replaceAlbumFavorites` borra las filas del usuario e inserta
las nuevas con `position = index + 1`, en una transacción. Mismo patrón que `replacePinned`.

**Por qué.** El editor manipula una lista pequeña y ordenada; enviar el estado completo
evita endpoints de "mover una posición" y condiciones de carrera. `replacePinned` ya
resolvió esto igual.

### D3 — Editor del dueño: elegir de los favoritos de álbum

**Decisión.** `OwnerAlbumFavoritesEditor` (client, montado solo en el propio perfil),
modelado en `OwnerShowcaseEditor`: lista los favoritos de álbum del dueño
(`getMyFavorites` filtrado a `release-group`), permite marcar hasta 6 y reordenarlos, y
guarda con el `PUT`. **Sin buscador de catálogo embebido** (memoria `list-detail-scope`).
Si el dueño no tiene favoritos de álbum, el editor muestra un estado que lo invita a
marcar álbumes como favoritos primero.

### D4 — Colocación: cabeza del bloque de identidad cultural

**Decisión.** La sección va **encima** de `PinnedShowcase` (los 4 destacados mixtos):

```
  Identidad (Placa)
  → Álbumes favoritos        ← nuevo, cabeza del bloque cultural
  → Destacados (4 mixtos)
  → Himno
  → Huella de gusto
  → …resto de estantes sin cambios…
```

En el layout público de dos columnas, en la **columna principal**, antes de
`PinnedSection`. En la vista del dueño (una columna), antes de `ShowcaseSection`.

**Por qué no reordenar todo el perfil.** El reorden vertical completo (D10) es una decisión
de diseño que puede seguir ajustándose; este cambio solo **inserta** la sección nueva en su
lugar y deja el resto del orden como está. Menos superficie, menos riesgo de regresión en
los tests de composición.

### D5 — Presentación: declaración, no ranking

**Decisión.** Rejilla 3×2 de carátulas + título + artista, cada una enlaza al álbum. Sin
números de posición visibles, sin estrellas, sin "porque lo escuchaste N veces". El orden
es del dueño y punto. Reutiliza `CoverThumb` / el patrón visual de `PinnedShowcase`.

### D6 — Visibilidad por nivel de acceso

**Decisión.** Igual que la huella y los destacados: se renderiza en **autorizado** (público
o seguidor aprobado) y **dueño**; **no** en bloqueo ni en perfil privado sin autorización.
Se modifica el requisito "Composición del perfil por nivel de acceso" de `social-profiles`
para nombrarla explícitamente.

**Nota de audiencia.** Un `favorite` tiene audiencia propia (`private`/`followers`/
`public`). Si el dueño fija como identidad un favorito `private`, ¿lo ve un seguidor? →
Open Question OQ1.

## Risks / Trade-offs

- **[Un favorito privado fijado como identidad]** (OQ1) → Fase 1: la sección respeta la
  audiencia del favorito subyacente (un favorito `private` fijado no se muestra a nadie más
  que al dueño; si los 6 son privados, la sección no aparece para el visitante). Alternativa
  (la identidad "gana" y siempre es pública) → revisar; la conservadora es no filtrar
  menos de lo que el favorito ya filtra.

- **[Desfijado silencioso al quitar un favorito]** → Es el comportamiento buscado (D1),
  pero el editor debe reflejarlo: al recargar, un pin cuyo favorito ya no existe
  simplemente no está. La cascada lo garantiza en la base.

- **[Tests de composición del perfil]** → Insertar una sección nueva toca
  `sections.tsx` / `page.tsx` / sus tests de snapshot de orden. D4 minimiza el cambio
  (insertar, no reordenar).

- **[El dueño sin favoritos de álbum ve una sección/editor "vacío"]** → El editor muestra
  la invitación a marcar favoritos; la **sección de display** no se renderiza si no hay
  pins (mismo criterio que los destacados).

## Migration Plan

1. `drizzle/0019_user_album_pin.sql` + espejo en `schema.ts` + tipo `UserAlbumPinRow`.
2. Servicio `src/services/profiles/album-favorites.ts`: `getAlbumFavorites`,
   `replaceAlbumFavorites`. Tests.
3. Zod + `PUT /api/me/profile/album-favorites` + tests de ruta.
4. `AlbumFavorites` (display) + `OwnerAlbumFavoritesEditor`; integrar en `sections.tsx` /
   `page.tsx` en la posición de D4; i18n.
5. Modificar la spec `social-profiles` y ajustar los tests de composición.
6. Docs.

**Rollback.** Tabla aditiva; quitar la sección de `sections.tsx`/`page.tsx` la oculta sin
tocar datos. `DROP TABLE user_album_pin` opcional.

## Open Questions

- **OQ1 — Audiencia de un favorito fijado como identidad.** Fase 1: la sección respeta la
  audiencia del favorito subyacente (no muestra a un visitante un favorito que el favorito
  mismo le ocultaría). Revisar si se quiere que la identidad sea siempre pública.
- **OQ2 — ¿Tope fijo de 6 exacto o "hasta 6"?** Propuesta: hasta 6 (0–6), rejilla 3×2 que
  tolera huecos. Igual que "los 4 destacados" toleran menos de 4.
- **OQ3 — Reordenar en el editor: drag & drop o botones subir/bajar?** Decisión de UI en
  implementación; `OwnerShowcaseEditor` usa el orden del array — replicar su interacción.
