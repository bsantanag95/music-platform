## 1. Servicio

- [x] 1.1 Prioridad de `producer` y orden de roles por nivel en `classifyPersonnel` (D1, D2)
- [x] 1.2 `recordingId` en las pistas de cada persona (D3)
- [x] 1.3 `groupCreditsByTrack` y `byTrack` en `getAlbumPersonnel` (D4)
- [x] 1.4 Tests de `personnel-levels` (productor que toca, programación sin producción, orden de roles, agrupación por canción, crédito de edición)

## 2. Pestaña Créditos

- [x] 2.1 Control Por persona / Por canción con estado en `?view` (D5)
- [x] 2.2 Vista por canción: pistas en orden, grupos Producción / Intérpretes / Sonido / Otros, "todo el álbum", pista sin créditos
- [x] 2.3 Números de pista enlazados con título (D3)
- [x] 2.4 Detalles: `+N` desde 2 ocultos, `h2` accesible, solista compacto, "varios instrumentos" (D6)
- [x] 2.5 i18n es/en
- [x] 2.6 Tests de `AlbumCredits` y de la página

## 3. Documentación y verificación

- [x] 3.1 Actualizar `docs/05-features/catalog-browsing.md`
- [x] 3.2 `pnpm run typecheck && pnpm run lint && pnpm run test` y `build` en una copia temporal (el servidor de desarrollo en 3000 puede ser del usuario)
- [x] 3.3 Navegador: *Eyes Wide Open* (productores en su nivel, vista por canción, enlaces de pista) y un álbum de banda
