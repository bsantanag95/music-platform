## Context

`default-audience` (change `rework-owner-management`) es una preferencia nullable en `app_user`
que solo se lee al crear contenido. Los cuatro tipos con audiencia propia guardan la columna
`audience` (`favorite`, `listen_entry`, `user_list`, `collection_entry`) y cada servicio ya sabe
cambiarla individualmente; favoritos y colección además tienen un cambio en lote por ids.

Efectos de la audiencia sobre lo fijado o destacado (verificados en los servicios):

- **Listas fijadas** (`user_list_pin`) y **álbumes favoritos fijados** (`user_album_pin`, vía el
  favorito) se filtran por la audiencia del elemento al construir el perfil: si pasan a `private`
  dejan de verse para los demás.
- **Entradas de diario destacadas** (`listen_entry_highlight`) siguen visibles con cualquier
  audiencia (spec `diary-visibility`, "Las entradas destacadas anulan la matriz de visibilidad").
- **Valoraciones destacadas** no tienen audiencia propia y no se ven afectadas.

## Goals / Non-Goals

**Goals:**

- Una acción explícita, atómica e idempotente que lleve la audiencia elegida a todo lo existente.
- Vista previa con conteos y aviso de destacados antes de confirmar.

**Non-Goals:**

- Que la preferencia se aplique sola (sigue sin ser retroactiva).
- Deshacer, aplicar por tipo o por selección.
- Cubrir reseñas, comentarios o la wishlist.

## Decisions

### 1. Botón aparte con confirmación, no casilla al guardar

Decisión del usuario. Cambiar la preferencia y aplicarla son dos gestos distintos: el primero es
inocuo y reversible, el segundo reescribe datos. Un botón separado, activo solo con una audiencia
elegida, evita aplicarlo sin querer. Con "Según el tipo" (`NULL`) el botón está desactivado: no hay
un valor único que aplicar (los defaults por tipo no son uniformes).

### 2. Se incluyen los fijados y destacados, avisando

Decisión del usuario. "Todo" significa todo. La confirmación muestra cuántos de los elementos que
cambiarían están fijados o destacados, desglosados en listas fijadas, álbumes favoritos fijados y
entradas de diario destacadas. Para el diario se aclara que las destacadas siguen visibles.

### 3. Servicio único con vista previa y aplicación

`src/services/social/apply-audience.ts` expone `previewApplyAudience(userId, audience)` y
`applyAudienceToExisting(userId, audience)`.

- **Vista previa:** cuatro `count(*)` con `audience <> $audience` sobre las filas del usuario, más tres
  conteos de destacados restringidos a esas mismas filas (`EXISTS` contra los pines/destacados). No
  modifica nada.
- **Aplicación:** una transacción con cuatro `UPDATE ... SET audience = $audience WHERE <dueño> AND
  audience <> $audience RETURNING id`. Devuelve los conteos reales (pueden diferir de la vista previa
  si algo cambió entre ambos pasos). Sin filas afectadas es un éxito con ceros (idempotente).
- Las listas se limitan a `kind = 'standard'` y `owner_id = userId`, como el resto de operaciones
  propias; no se tocan listas editoriales.
- El `UPDATE` no modifica otras columnas ni los pines/destacados. Sobre `updated_at`, ver la
  decisión 6.

### 6. Conservar `updated_at` con un indicador de transacción

`user_list.updated_at` y `collection_entry.updated_at` los mantiene un trigger `BEFORE UPDATE` que
pone `now()` en **cualquier** `UPDATE` (regla del proyecto: nunca desde la app). El feed deriva de
`user_list.updated_at` los eventos de "lista actualizada" (`feed.ts`) y `recency.ts` la última
actividad del perfil: una aplicación en bloque generaría de golpe un evento por lista y movería la
actividad del perfil, sin que nadie haya editado nada. La migración `0037` reemplaza las dos
funciones de trigger para que, si la transacción tiene `app.preserve_updated_at = 'on'`, conserven
`OLD.updated_at`; sin el indicador se comportan exactamente igual que hoy. La aplicación lo activa
con `set_config('app.preserve_updated_at', 'on', true)` (local a la transacción) antes de los
`UPDATE`. No se desactiva ningún trigger ni se cambia el comportamiento de las ediciones
individuales.

### 4. Contrato de API

`GET /api/me/default-audience/apply?audience=` → `200` con
`{ audience, favorites, diary, lists, collection, highlighted: { pinnedLists, pinnedAlbumFavorites,
highlightedDiary } }` (conteos de elementos que cambiarían) y `POST` con `{ audience }` → `200` con
`{ audience, favorites, diary, lists, collection }` (conteos actualizados). Ambos requieren sesión
(`401 AUTH_REQUIRED`) y validan `audience ∈ {private, followers, public}` (`400 VALIDATION_ERROR`;
`null` y "auto" no son válidos). Reutilizan `AUTH_REQUIRED` y `VALIDATION_ERROR`: sin códigos nuevos.

### 5. UI en `DefaultAudienceSettings`

El botón "Aplicar a lo existente" se añade bajo las opciones. Al pulsarlo se pide la vista previa; si
todos los conteos son cero se muestra un mensaje ("Todo tu contenido ya tiene esa audiencia") sin
diálogo; si no, se abre el `ConfirmDialog` existente con el conteo por tipo, el aviso de destacados y
el botón de confirmar. Tras confirmar se muestra el resultado y se refresca la página (`router.refresh`)
para que el perfil refleje el cambio. Estados de carga/error con los `role="status"`/`role="alert"`
ya usados en el componente.

## Risks / Trade-offs

- **Reescritura masiva sin deshacer** → confirmación con conteos, texto claro y aviso de destacados;
  la acción es idempotente y se puede volver a aplicar otra audiencia.
- **Conteos de la vista previa desactualizados** → la respuesta del POST devuelve los conteos reales.
- **Lista fijada que pasa a privada deja de verse en el perfil** → se avisa en la confirmación.
- **Migración sobre dos triggers existentes** → el cambio es inerte sin el indicador y las ediciones
  individuales no lo activan; hay tests de que sin indicador `updated_at` sigue avanzando.

## Open Questions

- Ninguna bloqueante.
