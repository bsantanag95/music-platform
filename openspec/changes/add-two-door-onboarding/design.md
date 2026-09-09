## Context

`redefine-content-hierarchy` (Q1, IQ5) definió el **onboarding de dos puertas**:

- **Construir identidad** — "elegí 3–5 álbumes que te definen" → alimenta perfil,
  recomendaciones y descubrimiento.
- **Registrar el presente** — "¿qué estás escuchando ahora?" → entrada inmediata a la
  experiencia cotidiana.

Ambas complementarias, ninguna obligatoria, cualquier orden. **Los álbumes del onboarding
SON los Álbumes favoritos** (IQ5): no hay colección temporal aparte.

Estado actual:

- Registro local (`POST /api/auth/register`) y Google (`/api/auth/google/callback`) crean
  el usuario y la sesión; el cliente/redirect lleva a Inicio.
- `AuthenticatedHome` muestra `OnboardingPrompt` (buscar gente / explorar) cuando el
  usuario no sigue a nadie — **onboarding social**, otra preocupación.
- `user_album_pin` (cambio `redesign-profile-album-identity`): FK a `favorite`, hasta 6,
  `replaceAlbumFavorites(userId, favoriteIds)` valida "favorito de álbum propio" y
  reemplaza el conjunto.
- `POST /api/me/diary` (`createListenEntry`) crea una escucha con contexto inferido y
  audiencia por defecto.
- `GET /api/catalog/search` devuelve `results` con `kind: "artist" | "release-group"` (y
  `songContext` opcional para queries de canción); ingiere de MusicBrainz lo no cacheado.

## Goals / Non-Goals

**Goals:**

- Ruta `/welcome` con las dos puertas, cada una salteable, en cualquier orden.
- Puerta 1 → Álbumes favoritos del perfil, **sin** rating ni entrada de diario.
- Puerta 2 → entrada de diario, con el flujo existente, **sin** favorito ni rating.
- El flujo se ve **una sola vez** por usuario; los existentes no lo ven.
- Redirección post-alta a `/welcome` solo para quien no lo completó.
- Mínima superficie: una migración aditiva (una columna), un endpoint, reuso del resto.

**Non-Goals:**

- Cambiar el `OnboardingPrompt` social de Inicio (más allá de un enlace a `/welcome`).
- Recomendaciones a partir de los álbumes del onboarding (Fase 2+).
- Un asistente multipaso obligatorio o un "% de perfil completo" (nada de gamificación).
- Backfill de identidad para usuarios viejos (se marcan onboardeados y listo).
- Reacción / impresión inline en la Puerta 2 (se puede ampliar luego desde el diario).
- Onboarding de "seguir gente" / artistas (Fase 2, `add-artist-following`).

## Decisions

### D1 — `app_user.onboarded_at` como marca única

`ALTER TABLE app_user ADD COLUMN onboarded_at TIMESTAMPTZ` (nullable). `NULL` = pendiente.
La migración hace `UPDATE app_user SET onboarded_at = created_at` — **todos los usuarios
actuales quedan onboardeados** y nunca ven `/welcome`.

Se marca al **completar o saltar** el flujo entero (no por puerta). Una vez marcado,
`/welcome` redirige a Inicio y la redirección post-alta ya no aplica. El usuario que
saltó puede seguir agregando álbumes favoritos desde el perfil y registrando escuchas
normalmente — no necesita volver a `/welcome`.

*Alternativa descartada:* derivar "onboardeado" de "tiene álbumes favoritos o entradas de
diario". Frágil: no distingue "saltó a propósito" de "todavía no hizo nada", y volvería a
aparecer tras borrar el último favorito.

### D2 — Redirección post-alta condicionada por `onboarded_at`

- **Registro local**: `AuthForm` (modo `register`) redirige a `/welcome` en vez de `/`.
  Un usuario recién registrado siempre tiene `onboarded_at` nulo, así que no hace falta
  chequear nada del lado del form.
- **Google**: el callback, tras `resolveOrCreateOAuthUser`, mira `user.onboardedAt`: si es
  `null` → redirige a `/<locale>/welcome`; si no → mantiene el retorno fijo actual. Esto
  cubre por igual al usuario nuevo y (teóricamente) a uno viejo sin marca — aunque la
  migración no deja ninguno.
- **Login local**: sin cambio (un usuario que hace login ya existía; si tuviera
  `onboarded_at` nulo por algún motivo, `/welcome` sigue accesible desde el enlace de
  Inicio).

`/welcome` **se auto-protege**: sin sesión → `/auth/login`; con `onboarded_at` no nulo →
`/`. Así la redirección post-alta y el guard no pueden divergir.

### D3 — Puerta 1: seed de Álbumes favoritos en una operación

`POST /api/me/onboarding` con `{ albumReleaseGroupIds: string[] }` (0..6). El servicio
`seedAlbumFavorites`:

1. Valida ≤ 6 y que cada `releaseGroupId` exista (rechaza con `VALIDATION_ERROR`).
2. Para cada RG sin `favorite` propio previo, crea uno (target `release-group`, audiencia
   **por defecto** del favorito — la misma que cualquier favorito nuevo; no se fuerza
   `public`).
3. Llama `replaceAlbumFavorites(userId, favoriteIds)` con los ids resultantes (reusa toda
   su validación y su transacción delete-then-insert).
4. **No** crea `rating` ni `listen_entry`.

El mismo endpoint marca `onboarded_at` (D4). Con `albumReleaseGroupIds: []` = "salté la
Puerta 1" (y, si es la última acción, cierra el onboarding).

*Alternativa descartada:* que el cliente haga `POST /api/me/favorites` N veces + `PUT
/api/me/profile/album-favorites`. N+1 requests, no atómico, y expone el orden intermedio.

### D4 — Cierre del onboarding

El onboarding se cierra con la **misma llamada** `POST /api/me/onboarding` (que siempre
setea `onboarded_at`). Flujos:

- Usuario elige álbumes en la Puerta 1 y toca "Guardar y continuar" → `POST` con los ids →
  onboardeado.
- Usuario toca "Saltar" / "Ir a Inicio" → `POST` con `[]` → onboardeado.
- Puerta 2 (registrar escucha) usa `POST /api/me/diary` y **no** cierra el onboarding por
  sí sola — el usuario todavía puede hacer la Puerta 1 o saltar. La página siempre ofrece
  un botón final que dispara el `POST /api/me/onboarding`.

Llamar `POST /api/me/onboarding` cuando ya se está onboardeado → `200` idempotente (no
re-siembra, no re-marca): la página no debería llegar ahí (el guard redirige antes), pero
el endpoint es tolerante.

### D5 — La página `/welcome`

Server Component con el guard; monta un client `TwoDoorOnboarding` que tiene:

- **Puerta 1**: buscador (`GET /api/catalog/search`, filtra `kind === "release-group"`),
  lista de resultados con carátula + título + año + artista, selección con tope 6, contador
  "Elegiste N (probá con 3–5)". Estado local; se envía con "Guardar y continuar".
- **Puerta 2**: buscador (mismo endpoint, acepta `release-group` y `recording` vía
  `songContext`); al elegir un objetivo, `POST /api/me/diary` inmediato y feedback
  ("Registrado: <título>"). Se pueden registrar varias.
- **Cierre**: botón "Ir a Inicio" (o "Terminar") siempre visible → `POST /api/me/onboarding`
  con los ids de la Puerta 1 (o `[]`) → `router.push("/")`.
- Las dos puertas son secciones hermanas en la misma página; el usuario hace una, la otra,
  las dos o ninguna, en el orden que quiera.

### D6 — `OnboardingPrompt` de Inicio: enlace mientras esté pendiente

`AuthenticatedHome` ya sabe si el usuario sigue a alguien. Se le pasa también
`onboardedAt`. Si `onboardedAt` es nulo, `OnboardingPrompt` (o un bloque hermano) muestra
un enlace "Completá tu perfil musical" → `/welcome`. Si no, el bloque social queda igual
que hoy. Cambio chico, sin tocar la lógica de `hasFollows`.

### D7 — Búsqueda de catálogo en onboarding: se acepta el coste de ingesta

`GET /api/catalog/search` ingiere de MusicBrainz lo no cacheado — puede tardar. Es el
mismo comportamiento que toda la app; el buscador muestra su estado de carga. No se
pre-cachea nada para el onboarding.

## Risks / Trade-offs

- **[El usuario se salta el onboarding y nunca arma su identidad]** → Aceptado: es
  opcional por diseño (Q1). Los Álbumes favoritos y el diario siguen accesibles desde el
  perfil. El enlace de Inicio (D6) da una segunda oportunidad pasiva.
- **[Un usuario viejo sin `onboarded_at` por un fallo de migración vería `/welcome`]** →
  La migración lo setea para todos; aún así el guard y la redirección son idempotentes y
  `/welcome` es inofensivo (solo agrega favoritos / escuchas reales). Bajo impacto.
- **[Doble marca / doble seed si el cliente reintenta el `POST`]** → `seedAlbumFavorites`
  usa `replaceAlbumFavorites` (reemplazo, no acumulación) y el `favorite` es un toggle
  idempotente; marcar `onboarded_at` dos veces es un `UPDATE` sin efecto. Seguro.
- **[Ingesta lenta en el buscador de la Puerta 1 desanima]** → Estado de carga claro; el
  onboarding no bloquea (se puede saltar). Si se vuelve un problema real, se puede sembrar
  un set curado de álbumes sugeridos (fuera de alcance ahora).
- **[Dos "onboardings" (este y el social de Inicio) confunden]** → D6 los mantiene
  separados en copy y ubicación: este es "tu identidad musical", el de Inicio es "conectá
  con gente". Documentado.

## Migration Plan

1. `drizzle/0020_app_user_onboarded_at.sql`: `ADD COLUMN onboarded_at TIMESTAMPTZ` +
   `UPDATE app_user SET onboarded_at = created_at`. Espejo en `schema.ts`.
2. Correr la migración. Verificar que todos los usuarios existentes tienen `onboarded_at`.
3. Desplegar el resto (aditivo). Si `/welcome` o el endpoint fallaran, el peor caso es que
   un usuario nuevo cae en una página con error en vez de en Inicio — mitigable revirtiendo
   el commit; la columna puede quedar sin problema.

Rollback: revertir el commit; la columna `onboarded_at` es inerte sin el código.

## Open Questions

- **OQ1 — ¿La Puerta 2 permite elegir la reacción (`obsessed`, etc.) inline, o solo
  registra la escucha "pelada"?** Propuesta: solo registra (contexto inferido, audiencia
  por defecto); la reacción se agrega después desde el diario. Mantiene el onboarding
  liviano. A confirmar en `/opsx:apply`.
- **OQ2 — ¿El namespace i18n es nuevo (`onboarding`) o un bloque dentro de `home`?**
  Propuesta: namespace nuevo `onboarding` (la ruta es `/welcome`, no Inicio). Confirmar.
