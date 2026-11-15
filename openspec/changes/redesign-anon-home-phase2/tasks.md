## 1. Marco y encabezados

- [x] 1.1 `HomeSectionHeading` (h2 32–40 px, descripción opcional, enlace «Ver …», `id` para `aria-labelledby`)
- [x] 1.2 `AnonymousHome` en el contenedor ancho del hero con separación `gap-16 lg:gap-24`; lanzamientos, funciones y cierre dentro del contenedor con el encabezado nuevo donde lo tienen

## 2. Colecciones y mejor valorados

- [x] 2.1 `CollectionMosaic`: destacada 2×2 + cuatro medianas + sexta a lo ancho desde `lg`; degradación con 1–5 colecciones; riel horizontal por debajo de `lg`; enlace a todas las colecciones
- [x] 2.2 «Mejor valorados» con `AlbumRail layout="scroll" headerless`, `albumArtistNames` y `★ <promedio>` bajo `HomeSectionHeading`
- [x] 2.3 Tests de `CollectionMosaic` por cantidad (8, 4, 1) y de la composición de `AnonymousHome`

## 3. Comunidad

- [x] 3.0 `HeroSampleEntry`: fila de estrellas + `92/100` en tono neutro, sin `ScoreBadge` (rating-display)
- [x] 3.1 `ActivityCard` (carátula, autor, nota compacta `★ 86/100` o `★ 4,5`, extracto en comentarios y reseñas) y `CommunityActivity layout="cards"`, primera tarjeta ancha; `rows` sigue por defecto
- [x] 3.2 Variante `panel` en `PopularComments` y `PublicLists`
- [x] 3.3 `PeopleCard` → `/users` al final de la columna lateral, visible aunque la comunidad venga vacía; retirar `showPeopleLink`
- [x] 3.4 Rejilla `2fr 1fr` desde `lg`, una columna debajo
- [x] 3.5 Tests: tarjeta de valoración con y sin puntaje detallado, tarjeta de comentario con extracto, Inicio con sesión sigue en filas, acceso a personas sin actividad

## 4. Textos, documentación y verificación

- [x] 4.1 Mensajes nuevos en `messages/{es,en}/home.json` (descripciones de sección, «Ver todas las colecciones», tarjeta de personas) y `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/home.md`: cuerpo de la portada sin sesión (contenedor, mosaico, riel, comunidad en dos columnas, acceso a personas)
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.4 Verificación en el navegador a 1440, 1024, 820 y 390 px sin sesión (sin desbordes, colecciones en riel en móvil) y `/explore` e Inicio con sesión sin cambios
