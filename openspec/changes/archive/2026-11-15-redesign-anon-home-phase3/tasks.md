## 1. Lanzamientos como horario

- [x] 1.1 `ReleaseTimetable`: partes «Recientes» (fecha desc.) y «Próximos» (asc.), filas con fecha, miniatura, título, artista y estado enlazadas al disco; seis visibles y el resto en `<details>`; dos columnas desde `lg`; sin partes vacías
- [x] 1.2 `HomeReleases layout="timetable"` solo desde `AnonymousHome`, con `HomeSectionHeading`; sin el prop, riel y selector igual que hoy
- [x] 1.3 Tests: orden, tope de seis con el resto disponible, una sola parte, Inicio con sesión sigue con el riel

## 2. Qué puedes hacer

- [x] 2.1 `HowItWorks` como bloque: tres paneles con demostración (diario, doble puntaje con `StarRatingValue`, colección física con atributos del vocabulario real) y lista de las otras seis con iconos SVG propios
- [x] 2.2 `HowItWorks` pinta el bloque; eliminar `FeatureCarousel` y sus mensajes de flechas si quedan sin uso
- [x] 2.3 Tests: nueve funciones visibles sin controles, demostraciones `aria-hidden` y sin usuarios

## 3. Cierre

- [x] 3.1 `AnonCta` en panel con el mosaico de fondo, título, línea nueva y acciones «Crear cuenta» (`/auth/register`) y «Explorar el catálogo» (`/explore` solo con descubrimiento habilitado)
- [x] 3.2 Tests del cierre con y sin descubrimiento

## 4. Textos, documentación y verificación

- [x] 4.1 Mensajes nuevos en `messages/{es,en}/home.json`, mensajes sin uso eliminados y `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/home.md`: horario, bloque de funcionalidades, cierre; pie móvil en «Pendiente»
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.4 Verificación en el navegador a 1440, 1024, 820 y 390 px sin sesión (sin desbordes, `<details>` con teclado) e Inicio con sesión sin cambios
