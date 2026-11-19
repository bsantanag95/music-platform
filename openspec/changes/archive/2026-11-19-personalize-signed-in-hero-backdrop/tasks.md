## 1. Datos

- [x] 1.1 `listMyBackdropAlbums(userId, limit = 20)` en `src/services/home/home.ts`: favoritos de álbum con carátula (recientes primero) y, si faltan, álbumes de escuchas con carátula por cantidad de escuchas (desempate por la más reciente), sin duplicados; solo `release_group`
- [x] 1.2 Tests: orden de favoritos, relleno por cantidad, sin duplicados, sin carátula fuera, el segundo paso no se consulta si los favoritos bastan, límite

## 2. Presentación

- [x] 2.1 `HeroBackdrop` (servidor, `aria-hidden`): con menos de `BACKDROP_MIN = 6` carátulas, el fondo actual; si no, rejilla 8 × 4 con la geometría de `HERO_WALL`, personales en las celdas visibles (columnas 3–7, desde la derecha, hasta 20) vía `AppImage` sin prioridad y el resto con recortes de `wall.webp`
- [x] 2.2 Misma opacidad y máscara en `lg+`; máscara `transparent 55%` y opacidad ~9 % por debajo de `lg`
- [x] 2.3 `SignedInHero` recibe las carátulas y monta `HeroBackdrop`; `AuthenticatedHome` las pide en el `Promise.all`
- [x] 2.4 Tests de `HeroBackdrop` (debajo del mínimo = fondo actual; orden y relleno de celdas; decorativo) y de `AuthenticatedHome`/`SignedInHero` (paso de props)

## 3. Documentación

- [x] 3.1 `docs/05-features/home.md`: fondo de la cabecera con sesión (origen, prioridad, mínimo, rendimiento)

## 4. Verificación

- [x] 4.1 `pnpm run verify` y `pnpm run typecheck && pnpm run lint && pnpm run build`
- [x] 4.2 Navegador con tu cuenta a 1440, 1024, 820 y 390 px: titular y campo legibles, sin desbordamiento, carátulas personales en la parte visible; cuenta por debajo del mínimo con el fondo general
