## Why

La auditoría de `/welcome` (2026-10-09) dejó pendiente el flujo en sí: en móvil la página mide ~2700 px con dos buscadores apilados, no dice con quién se comparte lo que el usuario elige, no cierra con nada que confirme lo hecho y no usa la señal más barata de valor continuo —seguir artistas— que alimenta «Lanzamientos recientes y próximos / De tus artistas», vacío para un usuario nuevo. Además se encontró un defecto: los favoritos que siembra la Puerta 1 nacen con la audiencia por defecto de la base (`followers`) en lugar de la que resuelve `resolveNewContentAudience` (`public` para favoritos, o la preferencia del usuario), de modo que los favoritos del onboarding y los que el usuario crea después tienen audiencias distintas.

## What Changes

- **Tres pasos con progreso** en lugar de dos secciones apiladas: 1 · Álbumes que te definen, 2 · Artistas que quieres seguir (nuevo), 3 · ¿Qué estás escuchando ahora? Indicador «Paso N de 3», Siguiente / Atrás, y cada paso se puede saltar. Los pasos conservan su estado al ir y volver.
- **Paso de artistas** (nuevo): busca artistas y los sigue al elegirlos (`PUT /api/artists/{id}/follow`), con «Dejar de seguir» para corregir. Sin tope, sin cambios de API.
- **Aviso de audiencia**: los pasos de álbumes y de escucha dicen con quién se comparte lo que se elige (audiencia efectiva de favoritos y de diario del usuario) y enlazan a Privacidad y audiencia.
- **Resumen final**: al terminar, en lugar de saltar a Inicio, una pantalla «Todo listo» con lo guardado (favoritos, artistas seguidos, escuchas) y los siguientes pasos (Inicio, Explorar si está activo, Buscar gente).
- Un solo botón de salida: «Saltar por ahora» si no se hizo nada, «Terminar ahora» si ya hay algo (guarda lo elegido).
- **Corrección**: `seedFavoriteAlbums` crea los favoritos con `resolveNewContentAudience(userId, "favorite")`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `onboarding`: el onboarding pasa de dos puertas a tres pasos guiados (requisito de la ruta reemplazado), se agregan el paso de artistas a seguir, el aviso de audiencia y el resumen final, y se explicita la audiencia de los favoritos sembrados.

## Impact

- `src/components/onboarding/`: `TwoDoorOnboarding` → `WelcomeFlow` (pasos, progreso, resumen); `ArtistFollowPicker` nuevo; `AlbumIdentityPicker` y `NowPlayingPicker` reportan su conteo y muestran el aviso de audiencia.
- `src/app/[locale]/welcome/page.tsx`: resuelve las audiencias efectivas y si Explorar está activo.
- `src/services/onboarding/onboarding.ts`: audiencia de los favoritos sembrados (+ pruebas).
- `messages/{es,en}/onboarding.json`, `docs/05-features/onboarding.md`, spec `onboarding`. Sin migraciones ni cambios de contrato de API.

## Non-Goals

- Cambiar el significado de «saltar»: sigue fijando `onboarded_at`. Dejarlo nulo al saltar en vacío haría que el login con Google (que envía a `/welcome` mientras `onboarded_at` sea nulo) devuelva a la persona al flujo en cada inicio de sesión.
- Persistir las selecciones entre recargas, el ranking de `/api/catalog/search` y el doble render de `push` + `refresh`.
- Pasos para «Quiero escuchar», géneros o valoraciones rápidas (candidatos para un cambio posterior).
