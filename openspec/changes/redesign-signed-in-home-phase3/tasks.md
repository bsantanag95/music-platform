## 1. Datos

- [x] 1.1 `getMostRecentEditedList`: solo listas con al menos un elemento (`innerJoin` con `user_list_item`); tests con una lista vacía más reciente
- [x] 1.2 `listCommunityActivity`: filtro `excludeViewer` (`appUser.id <> viewerId` en cada fuente), sin cambiar `/activity`; tests

## 2. Lanzamientos

- [x] 2.1 `ReleaseSwitcher` con cuerpo de horario (`ReleaseTimetable`), `tablist` junto a `HomeSectionHeading`, invitación debajo; misma lógica de vistas
- [x] 2.2 `HomeReleases` con `personalReleases` usa esa presentación; eliminar `ReleaseRail` y sus textos si quedan sin uso
- [x] 2.3 Tests: abre en personal con ≥ 3, invitación con < 3, «Populares» vacía oculta el selector, ambas vacías ocultan la sección, cambio de vista con flechas

## 3. Composición

- [x] 3.1 `ResumeList variant="row"` al pie de `RecentListensShelf`; sección propia si no hay escuchas
- [x] 3.2 Armado compartido de «Mejor valorados» (★ promedio, artistas) extraído de `AnonymousHome` y usado por ambos Inicios
- [x] 3.3 `AuthenticatedHome`: todo el cuerpo en el contenedor ancho; orden con uso (estante + retomar → feed → lanzamientos → colecciones → comunidad) y sin actividad (comunidad → mejor valorados → lanzamientos → colecciones → paneles); colecciones solo con `isExploreEnabled()`
- [x] 3.4 Sección «La comunidad»: con seguidos, tarjetas (2/3) + paneles de comentarios y listas + `PeopleCard` (1/3); sin seguidos, solo paneles; comunidad pedida con `excludeViewer`
- [x] 3.5 Textos nuevos en `messages/{es,en}/home.json` (títulos y bajadas que falten) y retiro de los que queden sin uso
- [x] 3.6 Tests de `AuthenticatedHome` (con uso / sin actividad / sin seguidos, mejor valorados solo sin actividad, colecciones según `/explore`, comunidad no duplicada) y de `ResumeList` en fila

## 4. Documentación

- [x] 4.1 `docs/05-features/home.md`: jerarquía con sesión final, lanzamientos con horario, retomar lista con elementos, comunidad sin lo propio y plan de tres fases completo
- [x] 4.2 `pnpm run i18n:client-messages` y revisar el diff

## 5. Verificación

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 5.2 Navegador con sesión a 1440, 1024, 820 y 390 px: sin desbordamiento, horario con selector, fila de retomar lista, colecciones, comunidad sin lo propio
- [x] 5.3 Cuenta sin actividad (cuenta de prueba local, borrada al terminar): mejor valorados y colecciones, comunidad arriba y no repetida
