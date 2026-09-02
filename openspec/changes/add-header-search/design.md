## Context

El Header (`src/components/layout/Header.tsx`) es un Client Component ya existente (usa
`usePathname`/`useRouter` de next-intl para el selector de idioma) con un link de texto
"Buscar" hacia `/search`. `/search` renderiza `SearchForm` (`src/components/catalog/SearchForm.tsx`),
un componente con estado propio (loading, aviso de primera importación lenta por MusicBrainz,
`EmptyState` de no encontrado, `ErrorState` de fallo) que resuelve la búsqueda con
`searchCatalog` (`src/lib/api/catalog.ts`) y navega a `/artist/<id>` en éxito.

El hero de Inicio (`src/app/[locale]/page.tsx`) embebe ese mismo `SearchForm` completo, hoy
visible para cualquier visitante con o sin sesión.

## Goals / Non-Goals

**Goals:**
- Búsqueda accesible desde cualquier página sin depender de navegar primero a `/search`.
- No duplicar los estados de error/vacío/carga de `SearchForm` dentro de la franja del Header.
- El buscador del hero de Inicio deja de mostrarse a usuarios con sesión activa.

**Non-Goals:**
- No se rediseña `SearchForm` ni sus estados existentes (loading lento, no encontrado, error).
- No se agrega autocompletado/typeahead — sigue siendo búsqueda por envío, no por sugerencias
  en vivo.
- No se toca el contrato de `GET /api/catalog/search` ni `searchCatalog`.

## Decisions

**Un componente nuevo (`HeaderSearch`) en vez de reusar `SearchForm` compacto.**
`SearchForm` maneja loading lento (~3s, aviso de primera importación), `EmptyState` y
`ErrorState` — pensados para ocupar una columna, no una franja de header de ~40px. Forzar ese
componente a un espacio compacto obligaría a ocultar/recortar esos estados, perdiendo la
información que sí tienen sentido en `/search`. `HeaderSearch` es deliberadamente más simple:
intenta resolver la búsqueda y, si no puede resolverla de inmediato (no encontrado o error),
delega el caso completo a `/search?q=<valor>` en vez de reimplementar esos estados en miniatura.

**Fallback por navegación con query param, no por estado compartido.**
Alternativa considerada: levantar el estado de búsqueda a un contexto compartido entre Header
y `/search`. Se descarta por complejidad innecesaria — el Header y `/search` no comparten
layout ni necesitan sincronización en vivo; un query param (`?q=`) es el mecanismo estándar de
Next.js para pasar la intención de búsqueda entre rutas, sin estado global nuevo.

**`SearchForm` autoejecuta con `initialQuery` en vez de que `/search` duplique la llamada a
`searchCatalog`.**
`/search` pasa `initialQuery` y dispara la misma lógica interna de `handleSubmit` una vez al
montar (mismo estado de loading/error/not-found que un envío manual). Evita mantener dos
caminos distintos para "buscar" dentro del mismo componente.

**Gate del hero de Inicio por composición, no por un flag interno de `SearchForm`.**
`src/app/[locale]/page.tsx` ya condiciona el bloque CTA (registro/login) a `!user`; el
`SearchForm` del hero se mueve dentro de ese mismo bloque condicional. No requiere cambios en
`SearchForm` ni en `home.ts`.

## Risks / Trade-offs

- [Doble intento de red en el caso "no encontrado"] `HeaderSearch` llama a `searchCatalog`,
  falla, y `/search` con `initialQuery` vuelve a llamarlo → Mitigación: aceptable, es el mismo
  costo que un usuario reintentando manualmente; no amerita pasar el resultado ya conocido
  entre rutas (evita estado compartido innecesario, ver Non-Goals).
- [`HeaderSearch` compite visualmente con el resto del Header en pantallas angostas] →
  Mitigación: queda fuera de alcance el detalle responsive fino; se implementa con las mismas
  utilidades Tailwind del resto del Header y se revisa en la verificación manual del cambio.

## Open Questions

Ninguna — el diseño quedó cerrado en la conversación previa con el usuario.
