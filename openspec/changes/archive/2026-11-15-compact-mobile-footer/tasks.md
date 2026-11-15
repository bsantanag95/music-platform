## 1. Pie compacto en móvil

- [x] 1.1 `Footer`: márgenes (`py-8 md:py-12`) y separaciones reducidos por debajo de `md`; tagline `hidden md:block`
- [x] 1.2 `FooterNav`: `h2` `sr-only md:not-sr-only`, lista en dos columnas por debajo de `md`
- [x] 1.3 Área táctil de 40 px por debajo de `md` en `FooterLink`, contacto, redes y «volver arriba»; sin cambios desde `md`

## 2. Tests y documentación

- [x] 2.1 Tests de `Footer`: los títulos de grupo siguen siendo encabezados; la frase de no reproducción sigue presente; clases de dos columnas y alto mínimo
- [x] 2.2 `docs/05-features/home.md`: quitar el pendiente del pie móvil y anotar el resultado

## 3. Verificación

- [x] 3.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.2 Medición en el navegador a 360, 390 y 600 px (alto < 900 px a 390, enlaces ≥ 40 px, sin scroll horizontal) y comprobación de que a 820, 1024 y 1440 px el pie no cambia
