## Why

La audiencia por defecto (`default-audience`) solo decide con qué audiencia nace el contenido **nuevo**;
la spec dice expresamente que cambiarla no toca nada de lo ya creado. Quien empieza a usar la
preferencia con una biblioteca grande (favoritos, diario, listas, colección) no tiene forma de
llevarla a todo lo que ya tiene sin abrir elemento por elemento. Se pide una acción explícita para
aplicar la audiencia elegida a todo lo existente.

## What Changes

- **Acción "Aplicar a lo existente"** en la pantalla Privacidad y audiencia, junto al control de la
  audiencia por defecto. Es una acción **aparte**: elegir o cambiar la preferencia sigue sin tocar
  nada. Solo está activa cuando hay una audiencia elegida (`private`, `followers` o `public`); con
  "Según el tipo" no hay un valor único que aplicar.
- **Confirmación con conteo.** Antes de aplicar, el sistema muestra cuántos elementos cambiarían por
  tipo (favoritos, entradas de diario, listas y copias de colección) y cuántos de ellos están fijados
  o destacados. Si nada cambiaría, lo dice y no pide confirmar.
- **Alcance.** Los cuatro tipos con audiencia propia: favoritos, entradas de diario, listas propias
  (`kind = 'standard'`) y copias de colección. Los elementos fijados o destacados **se incluyen** y la
  confirmación avisa cuántos son. No cubre reseñas ni comentarios (públicos por spec) ni la wishlist
  (siempre privada).
- **Atómica e idempotente.** Se aplica en una sola transacción; solo se actualizan los elementos cuya
  audiencia difiere; repetirla no cambia nada. No modifica la preferencia guardada ni fijados,
  destacados, valoraciones, escuchas o comentarios: únicamente la columna de audiencia.
- **Endpoints nuevos:** `GET /api/me/default-audience/apply?audience=` (vista previa con conteos, sin
  modificar nada) y `POST /api/me/default-audience/apply` con `{ audience }`.

### Goals

- Poder llevar a toda la biblioteca existente la audiencia elegida con una sola acción.
- Que nadie cambie miles de elementos sin saberlo: confirmación con conteos y aviso de destacados.
- Que la acción sea segura de repetir y no toque nada más que la audiencia.

### Non-Goals

- Que cambiar la preferencia aplique el cambio de forma automática (sigue sin ser retroactivo).
- Aplicar por tipo o por selección de elementos (ya existen los cambios individuales y en lote).
- Deshacer la acción: no se guarda el estado anterior; se puede volver a aplicar otra audiencia.
- Dar audiencia a reseñas y comentarios.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `default-audience`: cambia el requisito "La preferencia no es retroactiva" (admite la acción
  explícita como única vía de cambio en bloque) y "Control de audiencia por defecto en Ajustes"
  (el texto ya no dice que lo existente no se pueda cambiar en bloque); se añaden los requisitos de
  la acción de aplicar, su vista previa y su contrato de API.

## Impact

- **Código nuevo:** `src/services/social/apply-audience.ts` (vista previa y aplicación), rutas
  `src/app/api/me/default-audience/apply/route.ts`, cliente en `src/lib/api/`, esquemas Zod.
- **Código afectado:** `src/components/settings/DefaultAudienceSettings.tsx` (botón y confirmación),
  mensajes `es`/`en`.
- **Base de datos:** una migración (`0037`) que hace que los triggers de `updated_at` de `user_list` y
  `collection_entry` respeten un indicador de transacción para conservar el valor anterior (sin el
  indicador se comportan igual que hoy). La acción hace `UPDATE` solo de la columna `audience` de
  `favorite`, `listen_entry`, `user_list` y `collection_entry`.
- **Documentación:** `docs/05-features/user-profile.md`, `docs/04-api/contracts.md`.
- **Sin dependencias nuevas.**
