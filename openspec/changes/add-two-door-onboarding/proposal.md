## Why

Hoy un usuario recién registrado cae en Inicio con un bloque de onboarding genérico que
solo lo manda a "buscar gente" o "explorar el catálogo". No hay un momento que lo invite a
**decir quién es musicalmente** ni a **entrar a la experiencia cotidiana**. La dirección
`redefine-content-hierarchy` (Q1 / IQ5, Fase 1) define un **onboarding de dos puertas**:
construir identidad (álbumes que te definen) y registrar el presente (qué estás escuchando
ahora), ninguna obligatoria, cualquier orden.

## What Changes

- **Nueva ruta `/[locale]/welcome`**: la superficie de onboarding con **dos puertas**
  complementarias, cada una salteable:
  - **Puerta 1 — "Álbumes que te definen"**: buscador de álbumes; el usuario elige entre
    3 y 5 (tope 6). Al guardar, esos álbumes se convierten **directamente en sus Álbumes
    favoritos** del perfil (IQ5) — se crea el `favorite` de álbum y se fija en
    `user_album_pin`. **Sin** rating automático ("esto me representa" ≠ "5 estrellas") y
    **sin** entrada de diario (el onboarding construye identidad, no registra consumo).
  - **Puerta 2 — "¿Qué estás escuchando ahora?"**: buscador de álbum o canción; al elegir,
    se crea una **entrada de diario** (escucha) al instante, con el flujo existente. Sin
    exigir impresión ni reflexión.
- **El onboarding se muestra una sola vez**: nuevo campo `app_user.onboarded_at`. Tras
  completar o saltar el flujo, queda marcado y `/welcome` redirige a Inicio. Los usuarios
  existentes se marcan como ya onboardeados en la migración.
- **Redirección post-alta**: tras registrarse (formulario local o Google), un usuario con
  `onboarded_at` nulo aterriza en `/welcome` en lugar de Inicio. El login de un usuario ya
  onboardeado no cambia.
- **El bloque de onboarding de Inicio** (`OnboardingPrompt`, para quien no sigue a nadie)
  se conserva — es una preocupación distinta (onboarding social). Se añade un enlace a
  `/welcome` mientras el flujo esté pendiente.
- **Sin nada automático de más**: la Puerta 1 no crea ratings ni escuchas; la Puerta 2 no
  crea favoritos ni ratings.

## Capabilities

### New Capabilities

- `onboarding`: la ruta `/welcome` y el flujo de dos puertas — su entrada (redirección
  post-alta para usuarios con `onboarded_at` nulo), las dos puertas y qué escribe cada una
  (Puerta 1 → Álbumes favoritos sin rating ni diario; Puerta 2 → entrada de diario), la
  salteabilidad de cada puerta, la naturaleza de-una-sola-vez, y el guard de `/welcome`.

### Modified Capabilities

- `google-oauth`: la redirección post-autenticación pasa a depender del estado de
  onboarding — un usuario recién creado (o con `onboarded_at` nulo) va a
  `/<locale>/welcome`; un usuario ya onboardeado mantiene el retorno fijo actual.

## Impact

- **Migración** `drizzle/0020_app_user_onboarded_at.sql`: `ALTER TABLE app_user ADD COLUMN
  onboarded_at TIMESTAMPTZ` + `UPDATE app_user SET onboarded_at = created_at` (los
  existentes ya están onboardeados). Espejo en `src/db/schema.ts`.
- **Nuevo servicio** `src/services/onboarding/onboarding.ts` — `seedAlbumFavorites(userId,
  releaseGroupIds)` (crea `favorite` + fija en `user_album_pin`, reusa
  `replaceAlbumFavorites`) y `markOnboarded(userId)`.
- **Nuevo endpoint** `POST /api/me/onboarding` — `{ albumReleaseGroupIds: string[] }`:
  siembra los favoritos de álbum y marca `onboarded_at`. La Puerta 2 reutiliza
  `POST /api/me/diary`.
- **Nueva ruta** `src/app/[locale]/welcome/page.tsx` (Server Component, guard) + client
  `TwoDoorOnboarding` con los dos buscadores (reusa `GET /api/catalog/search`).
- **Modificado** `src/components/auth/AuthForm.tsx` (registro → `/welcome`),
  `src/app/api/auth/google/callback/route.ts` (redirect condicional),
  `src/components/home/OnboardingPrompt.tsx` (enlace a `/welcome` si pendiente).
- **Zod** `OnboardingRequestSchema`, `OnboardingResponseSchema`.
- **i18n** `messages/{es,en}/` (nuevo namespace `onboarding` o bloque en `home`).
- **Docs** `docs/05-features/` (onboarding), `docs/03-data/sql-model.md`,
  `docs/04-api/contracts.md`.
- Sin cambios en `rating`, el feed, ni el modelo de `favorite` / `listen_entry` /
  `user_album_pin` (solo se usan).
