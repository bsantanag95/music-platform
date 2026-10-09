## 1. Paso de Pendientes

- [x] 1.1 `WantToListenPicker`: álbum/artista con el conmutador, guarda con `toggleWantToListen` (reintenta si el toggle quitó algo que ya estaba), «Quitar» con `removeFromWantToListen`, guarda contra clics repetidos, errores, `sessionStorage`; pruebas
- [x] 1.2 `WelcomeFlow`: cuarto paso, indicador «Paso N de 4», conteo para el botón de salida y el resumen

## 2. Resumen

- [x] 2.1 Línea «N en tus Pendientes» y sugerencias de lo no hecho: «Elegir tus géneros» (`/me/settings/profile`) y «Valorar un disco» (`/search?type=album`, solo sin escuchas registradas); pruebas

## 3. Textos, documentación y verificación

- [x] 3.1 `messages/{es,en}/onboarding.json`
- [x] 3.2 `docs/05-features/onboarding.md` y `docs/05-features/README.md`
- [x] 3.3 Navegador: paso 4 con la API real (un solo `POST` por dos clics, el elemento aparece en `GET /api/me/want-to-listen`) y resumen con las sugerencias; usuarios de prueba borrados
- [x] 3.4 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
