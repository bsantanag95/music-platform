## 1. Header: búsqueda en pantallas angostas

- [x] 1.1 Botón de búsqueda propio en la barra por debajo de `lg` (icono SVG, 44 × 44 px, `aria-expanded`/`aria-controls`, nombre accesible en `es`/`en`)
- [x] 1.2 Fila bajo la barra con `HeaderSearch fluid`, foco al abrir, cierre con Escape, con el botón y al navegar (foco de vuelta al botón); menú y búsqueda mutuamente excluyentes
- [x] 1.3 Quitar `HeaderSearch` del menú desplegable
- [x] 1.4 Tests de `Header` (con y sin sesión): abrir, cerrar con Escape, exclusión con el menú, el menú sin campo de búsqueda

## 2. Buscador del hero

- [x] 2.1 Variante `size="hero"` en `HeaderSearch` (alto ~56–60 px, botón «Buscar» visible) sin cambiar su comportamiento
- [x] 2.2 Accesos «Prueba con …» curados en `src/lib/config/hero-covers.ts` que enlazan a `/search?type=artist&q=<nombre>`
- [x] 2.3 Tests de `HeaderSearch` para la variante: misma navegación, sugerencias y reinicio a Artistas

## 3. Hero en dos columnas

- [x] 3.1 `HeroCrate`: cuatro carriles desde `HERO_WALL` con `background-position`, perspectiva y máscara, desplazamiento lento solo `motion-safe`, estático con movimiento reducido, `aria-hidden`; precarga de `wall.webp`; eliminar `HeroCoverWall` si queda sin uso
- [x] 3.2 `HeroSampleEntry`: álbum del muro, estrellas, 92/100, contexto «Redescubrimiento», rótulo «Ejemplo», sin enlace ni usuario; reutiliza estrellas e insignia de puntaje existentes
- [x] 3.3 `AnonHero` en dos columnas (≥ `lg`) y apilado en móvil: titular de una idea, bajada sobre fondo liso, buscador, accesos de ejemplo y acciones
- [x] 3.4 Acciones directas: «Crear cuenta» → `/auth/register`, «Inicia sesión» → `/auth/login`; eliminar `GetStartedModal` y sus mensajes
- [x] 3.5 Enlace «Conoce a quienes escuchan» → `/users` en el bloque de comunidad; quitar el botón suelto «Usuarios» de `AnonymousHome`

## 4. Textos

- [x] 4.1 `messages/es/home.json`: tuteo uniforme (`heroLine*`, `feature1Title`), `anonSubtagline` sin «Acá» y con «construyes»; textos nuevos del hero, del ejemplo y del enlace a Usuarios
- [x] 4.2 `messages/en/home.json` con la misma estructura
- [x] 4.3 `pnpm run i18n:client-messages` y test de mensajes del cliente al día

## 5. Listas públicas sin listas vacías

- [x] 5.1 `listPublicLists`: condición `EXISTS` sobre `user_list_item` antes del `limit`
- [x] 5.2 Test del servicio: una lista pública vacía no aparece y no resta lugar a una con elementos

## 6. Documentación y verificación

- [x] 6.1 `docs/05-features/home.md`: hero nuevo (buscador revertido con su motivo, caja de carátulas, entrada de ejemplo, acciones directas), Header en pantallas angostas, listas vacías excluidas y plan de las Fases 2 y 3
- [x] 6.2 Actualizar tests de `AnonymousHome`/`AnonHero` (sin modal, buscador presente sin sesión y ausente con sesión, rótulo de ejemplo)
- [x] 6.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.4 Verificación en el navegador a 1440, 1024, 820 y 390 px en `/es` sin sesión y en una página de catálogo (Header), sin desbordes, con movimiento reducido y con teclado
