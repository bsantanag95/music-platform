## 1. Tarjeta e identidad

- [x] 1.1 Tarjeta en `page.tsx` (servidor): `<header>` con superficie y borde, rejilla carátula · identidad y ficha · columna lateral con filete; en el teléfono carátula de 88 px junto a la identidad y el resto a todo el ancho
- [x] 1.2 `SongIdentity`: antetítulo «Canción» en mono, `<h1>` en `clamp(1.875rem,3.4vw,2.75rem)`, artistas en `font-display` ámbar; carátula del disco principal enlazada (≤ 250 px)

## 2. Ficha y comunidad

- [x] 2.1 `SongFacts` en dos columnas (una en el teléfono), solo filas con dato: Duración, Disco, Escrita por, Pista, Género, Primera aparición (solo la fecha si es el disco principal), Producción (≤ 2 productores enlazados), Versión, Versiones («N versiones →» al ancla de la sección)
- [x] 2.2 `SongCommunity`: sin ninguna actividad ni listas no se dibuja; con actividad, igual que hoy, dentro de la tarjeta

## 3. Columna lateral y página

- [x] 3.1 `SongTrackStrip` compacto: «Recorrer el disco» con anterior/siguiente (o inicio/fin) en la columna lateral; en el teléfono una fila; sin tira, no va
- [x] 3.2 Sin sesión: `SongRateInvite` con «Valorar esta canción» (ámbar, a `/auth/login`) + frase oculta en el teléfono, sin montar `SongRelationPanel`; con sesión, el panel sin caja en la columna lateral
- [x] 3.3 `page.tsx`: `main` a 88rem (`px-4 sm:px-8 xl:px-12`), miga y Compartir encima de la tarjeta, la franja de la tira retirada del cuerpo; producción y total de versiones a la ficha
- [x] 3.4 Mensajes `catalog.song` (es/en): disco, pista, género, producción, versiones, recorrer el disco, valorar y frase
- [x] 3.5 Tests de la cabecera, del panel y de la página: visitante sin panel ni línea de comunidad vacía, ficha con disco/pista/producción/versiones, primera aparición en otro disco, sin tira

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md` (sección 3b): la tarjeta y el plan de las Fases 2 y 3
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440, 1152, 1024, 820 y 390 px, sin sesión: Hallowed Be Thy Name (última pista) y Run to the Hills (pista intermedia) (la canción sin tira y la primera aparición en otro disco, cubiertas por los tests de la página); créditos ≤ 680 px a 390; sin desbordes
