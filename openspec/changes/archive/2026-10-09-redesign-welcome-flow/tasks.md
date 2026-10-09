## 1. Servicio

- [x] 1.1 `seedFavoriteAlbums`: crear los favoritos con `resolveNewContentAudience(userId, "favorite")`; actualizar `onboarding.test.ts` (sin preferencia → `public`, preferencia → esa audiencia)

## 2. Pasos

- [x] 2.1 `ArtistFollowPicker`: busca artistas (`useTargetSearch("artist")`), sigue/deja de seguir con `followArtist`/`unfollowArtist`, guarda contra clics repetidos, error de seguimiento, `onCountChange`; pruebas
- [x] 2.2 `AlbumIdentityPicker` y `NowPlayingPicker`: aviso de audiencia con enlace a Privacidad; `NowPlayingPicker` reporta su conteo (`onCountChange`)
- [x] 2.3 `WelcomeFlow` (reemplaza a `TwoDoorOnboarding`): indicador «Paso N de 3», Siguiente / Atrás / Saltar este paso, pasos montados con `hidden`, botón de salida «Saltar por ahora» / «Terminar ahora»
- [x] 2.4 Resumen «Todo listo» tras el cierre, con los conteos mayores que cero y los siguientes pasos (Inicio, Explorar si está activo, Buscar gente); pruebas del flujo completo

## 3. Página, textos y documentación

- [x] 3.1 `welcome/page.tsx`: pasar las audiencias efectivas y `isExploreEnabled()`; ajustar `page.test.tsx`
- [x] 3.2 `messages/{es,en}/onboarding.json`: pasos, progreso, paso de artistas, avisos de audiencia, resumen
- [x] 3.3 `docs/05-features/onboarding.md` (+ nota de `home.md` si aplica) y Purpose del spec `onboarding`

## 4. Verificación

- [x] 4.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 4.2 Navegador con usuario nuevo a 375 px: tres pasos, ir y volver conservando lo elegido, seguir un artista (un solo `PUT` por dos clics), registrar una escucha, terminar con «Terminar» y ver el resumen; favorito sembrado con audiencia `public`; usuario de scratch borrado. «Dejar de seguir», «Deshacer» y los casos de error quedan cubiertos por pruebas, no por navegador
