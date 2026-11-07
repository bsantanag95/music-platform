## Context

Tercera fase de `add-top-n-lamina`. Decisiones tomadas al abrirla (2026-11-07): después del registro la persona va directo a armarla, y se heredan formato y
tipo, con el título como sugerencia para tocar.

Estado de partida:

- La página pública de una Lámina ya es legible sin cuenta y resuelve la sesión.
- El alta local y Google mandan a `/welcome` a quien tiene `onboarded_at` nula. Inicio muestra un enlace a `/welcome` mientras siga pendiente.
- `docs/02-architecture/auth.md` y la spec `google-oauth` prohíben una URL de retorno controlada por el cliente, para no abrir una redirección.
- `oauth_state` guarda el estado del flujo protegido por `state`, PKCE y `nonce`; `remember` ya viaja allí y el callback no lee su propio query.
- El §6 del documento decía que `/welcome` recibía la intención en `next=`. Ese parámetro no existe.

## Goals / Non-Goals

**Goals:**

- Un llamado claro, sin muro de registro.
- Una excepción al retorno fijo que no admita ningún destino elegido por el cliente.

**Non-Goals:**

- Copiar ítems, registrar el vínculo entre Láminas, medir la conversión.

## Decisions

### 1. La intención es un id de Lámina, no una URL

El registro y el login reciben `?lamina=<uuid>`. Después de autenticarse, el destino lo arma el código: `/<locale>/me/laminas?desde=<uuid>`. Un helper (`src/lib/laminas/intent.ts`) valida el `uuid` y arma la ruta; cualquier otro valor se descarta.

- **Por qué:** lo único que el cliente aporta es un identificador validado, y la ruta es fija. No hay forma de redirigir a otro lugar. Es el mismo criterio que las intenciones cerradas de Google.
- **Alternativa:** el `next=` del documento. Abre justo lo que `auth.md` prohíbe, aunque se valide.
- **Alternativa:** formato y tipo en la URL. Dos parámetros cerrados, pero pierde el título y el enlace de vuelta.

Queda en un ADR nuevo (0052) porque cambia una regla escrita de la autenticación.

### 2. En Google, la intención viaja en el estado del flujo

`GET /api/auth/google/start?lamina=<uuid>` la guarda en `oauth_state` como `laminaId`, solo con la intención `login`. El callback la lee del estado guardado, nunca de su query, igual que `remember`. Un valor inválido se descarta en el inicio y el flujo sigue normal.

### 3. Directo a armarla; la bienvenida queda pendiente

La intención manda sobre `onboarded_at` nula: quien llega por este camino no pasa por `/welcome`.

- **Por qué:** vino a hacer algo concreto, y armar a mano no necesita valoraciones. Tres pasos en medio cortarían el impulso. Inicio ya ofrece la bienvenida mientras siga pendiente, así que no se pierde.
- Un usuario ya registrado que entra por el login llega al mismo destino.
- El idioma preferido de la cuenta sigue mandando sobre el del flujo.

### 4. Lectura de inspiración con las reglas de lectura de siempre

`getLaminaInspiration(id, viewerId)` busca al dueño y pasa por `getUserLamina`, así que aplica audiencia, perfil y moderación como la página pública. Devuelve `{ format, entityType, title, ownerUsername }`, sin ítems ni notas. Devuelve `null` si no existe, si no se puede ver o si es propia: el formulario queda como siempre, sin error.

### 5. Formulario inspirado

`/me/laminas?desde=<id>` pasa la inspiración a `LaminaCreateForm`: formato y tipo iniciales, una línea "Como la de @ana" que enlaza a esa Lámina y el título como primer chip, en cualquier fuente. Nada queda escrito en el campo: un título personal no se cuela solo. Una persona nueva arranca en "A mano", porque no tiene valoraciones; las fuentes siguen disponibles.

### 6. El llamado

Bloque bajo la lista, solo para quien no es dueño. Sin sesión: botón al registro y enlace "Ya tengo cuenta" al login. Con sesión: botón a `/me/laminas?desde=<id>`. Los enlaces entre login y registro conservan `lamina`. Si una persona con sesión abre el registro o el login con `lamina`, va directo al formulario.

## Risks / Trade-offs

- [La bienvenida puede no completarse nunca] → Inicio la sigue ofreciendo; es el comportamiento que ya existe para quien la deja pendiente.
- [La intención se pierde en recuperación de contraseña o verificación de email] → se acepta: son desvíos poco frecuentes y la persona cae en su flujo normal.
- [El id de la Lámina queda en la URL del registro] → es el mismo id de la URL pública que la persona acaba de abrir.
- [Una Lámina que se hizo privada entre el clic y el alta] → la lectura devuelve `null` y el formulario queda vacío.

## Migration Plan

Sin migración. Una cookie `oauth_state` en curso al desplegar no trae `laminaId` y sigue su flujo normal.

## Open Questions

Ninguna.
