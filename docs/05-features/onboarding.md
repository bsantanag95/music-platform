# Onboarding de dos puertas

**Fase 1 de `redefine-content-hierarchy` · cambio `add-two-door-onboarding` · Estado: ✅
implementado**

Un usuario recién registrado aterriza en **`/[locale]/welcome`** con dos puertas
complementarias, ninguna obligatoria, cualquier orden. Responde dos preguntas distintas:

- **Puerta 1 — "Álbumes que te definen"** (identidad): *"¿qué música te representa?"*
- **Puerta 2 — "¿Qué estás escuchando ahora?"** (presente): *"¿qué está pasando con vos
  ahora?"*

## Puerta 1 — los álbumes elegidos SON los Álbumes favoritos

"¿Qué álbumes te definen?" y "¿cuáles son tus álbumes favoritos?" son la misma pregunta
(IQ5): no hay colección temporal aparte. El usuario busca álbumes y elige entre 3 y 5
(tope 6). Al guardar:

- se crea el `favorite` de álbum de cada uno (audiencia por defecto de un favorito nuevo);
- se fijan como Álbumes favoritos del perfil (`user_album_pin`), en el orden de elección;
- **no** se crea ningún `rating` ("esto me representa" ≠ "5 estrellas");
- **no** se crea ninguna entrada de diario (el onboarding construye identidad, no registra
  consumo).

El sexto espacio de Álbumes favoritos se completa después desde el perfil.

## Puerta 2 — registrar el presente

El usuario busca un álbum o una canción y, al elegirlo, se crea una **entrada de diario**
con el flujo existente: contexto inferido, audiencia por defecto, **sin pedir reacción ni
impresión** (OQ1 — se agregan después desde el diario, cuando el usuario quiera expresar
algo más). Puede registrar varias. La Puerta 2 por sí sola **no cierra** el onboarding.

## Una sola vez

`app_user.onboarded_at` (nulo = pendiente). Se fija al **completar o saltar** el flujo,
mediante `POST /api/me/onboarding` (que también siembra los álbumes de la Puerta 1).
Mientras sea nulo:

- la redirección post-alta (formulario local y Google) lleva a `/welcome`;
- Inicio muestra un enlace pasivo "completá tu perfil musical" → `/welcome`.

Una vez fijado, `/welcome` redirige a Inicio y los dos accesos anteriores desaparecen. Los
usuarios que ya existían cuando se introdujo la capacidad quedaron marcados como
onboardeados (`onboarded_at = created_at`): nunca ven `/welcome`.

`POST /api/me/onboarding` es idempotente: llamarlo para un usuario ya onboardeado devuelve
`200` sin re-sembrar ni re-marcar.

## Distinto del onboarding social de Inicio

`AuthenticatedHome` ya muestra un bloque de onboarding **social** (`OnboardingPrompt`)
cuando el usuario no sigue a nadie: buscar gente, explorar listas públicas, registrar la
primera escucha. Ese bloque se conserva y es otra preocupación:

| | Onboarding de dos puertas (`/welcome`) | Bloque social de Inicio |
|---|---|---|
| Pregunta | "¿quién sos musicalmente?" | "¿con quién te conectás?" |
| Se muestra | una vez, tras el alta | mientras no sigas a nadie |
| Escribe | Álbumes favoritos / entrada de diario | nada (solo enlaces) |

## Modelo de datos

| Tabla / columna | Qué |
|---|---|
| `app_user.onboarded_at` | `TIMESTAMPTZ` nullable (migración 0020). Nulo = onboarding pendiente. Se fija al completar o saltar `/welcome`. |
| `favorite` / `user_album_pin` | Escritos por la Puerta 1 (reusa `replaceAlbumFavorites`). Sin cambios de esquema. |
| `listen_entry` | Escrito por la Puerta 2 (reusa `createListenEntry`). Sin cambios de esquema. |
