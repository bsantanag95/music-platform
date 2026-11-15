## Context

`Header` (cliente) monta a la izquierda `Logo` (cuadrado ámbar con «♪», enlace a Inicio), `HeaderSearch` compacto (`w-40`, `focus:w-56`) y la
navegación en `font-data text-sm`; a la derecha, selector de idioma (`text-[11px]`), y sin sesión `AuthActions` (dos enlaces de 12 px) o con
sesión «Añadir», campana y `UserMenu`. Por debajo de `lg`, desde la Fase 1 de la portada, búsqueda y menú tienen botones propios. Con sesión,
la fila completa necesitaba ~835 px (`fix-header-overflow`). Referencia visual: cabecera de `mockups/home-2026-11/c-disqueria.html`.
Decisiones del usuario (2026-11-15): monograma + nombre; navegación en Space Grotesk; orden del mockup.

## Goals / Non-Goals

**Goals:** buscador protagonista en escritorio, marca reconocible, navegación y cuenta legibles, sin desbordes con sesión a 1024 px.

**Non-Goals:** tipografías globales, destinos, menú de usuario, «Añadir», notificaciones, logo definitivo.

## Decisions

### Rejilla de tres zonas
La fila de escritorio pasa de `flex justify-between` a una rejilla `grid-cols-[auto_minmax(0,1fr)_auto]`: marca + navegación | buscador |
cuenta. El buscador vive en la columna central con `w-full max-w-[30rem] justify-self-center` y un mínimo de ~12rem, así crece con el ancho y
cede espacio a la cuenta en 1024 px. *Alternativa descartada:* ancho fijo de 460 px como el mockup — con sesión no cabe a 1024 px.

### Variante fluida del buscador del Header
`ScopedSearchField` (variante `compact`) gana un modo `header` que reemplaza `w-40 focus:w-56` por `w-full`, sube el alto a 40 px y el texto
a `text-sm` en la tipografía de cuerpo, y muestra la pista `/` (`<kbd>`, `aria-hidden`) cuando el campo está vacío y sin foco. El
comportamiento no cambia; la fila móvil sigue usando `fluid`.

### Atajo `/`
Un `keydown` en `window` dentro de `Header`: si la tecla es `/` sin modificadores y `event.target` no es `input`, `textarea`, `select` ni
`[contenteditable]`, y no hay un `[role="dialog"][aria-modal="true"]` abierto, hace `preventDefault` y enfoca el campo (escritorio) o abre la
fila de búsqueda (debajo de `lg`, con la lógica de la Fase 1). El campo se localiza dentro de su contenedor (`#header-desktop-search`), y `offsetParent` dice si está visible (escritorio) o
oculto (debajo de `lg`), sin reenviar refs por `HeaderSearch`. *Alternativa descartada:* `accesskey` — depende del navegador y no permite `/`.

### Marca
`Logo` gana `withName` (por defecto `false`, para no cambiar el pie): monograma + `appName` en `font-display` 18px, oculto debajo de `sm` y entre `lg` y `xl`: medido a 1024 px sin sesión, la fila ya ocupaba los 1009 px disponibles con el buscador en su mínimo, así que con sesión desbordaba.
El enlace pasa a `aria-label="{appName} — {home}"`. El monograma sigue saliendo de `BRAND_MONOGRAM` (placeholder documentado en PRODUCT.md).

### Navegación y cuenta
Enlaces en `font-display text-[15px]`, `px-3 py-2 rounded-md`, `hover:bg-ink-surface`; la sección actual conserva `aria-current` y el
subrayado ámbar. Sin sesión: «Iniciar sesión» como botón fantasma y «Crear cuenta» primario ámbar, ambos `h-10`, `font-display`; la clave
nueva `common.createAccount` (la de `users.json` es de otra superficie). Selector de idioma a `text-xs` con `h-8`. «Añadir», la campana y el
disparador del menú de usuario no cambian: la fila los centra verticalmente con el resto.

### DESIGN.md
La sección *Navigation* pasa a decir que los enlaces de la cabecera van en la tipografía de interfaz (Space Grotesk) y que la monoespaciada
queda para datos; el resto del sistema no cambia.

## Risks / Trade-offs

- [Desborde con sesión a 1024 px] → Rejilla con mínimo del buscador y nombre de la marca oculto entre `lg` y `xl` si hace falta; se mide a
  1024, 1280 y 1440 px con y sin sesión.
- [El atajo `/` choca con campos de texto] → Se ignora dentro de campos editables y con modificadores; tests de ambos casos.
- [Cambio visible en todas las páginas] → Verificación en Inicio, álbum, artista y `/search`, con y sin sesión.

## Migration Plan

Sin datos ni API; revertir el commit restaura la cabecera anterior.

## Open Questions

Ninguna bloqueante. El nombre provisional se cambia en `common.appName` cuando haya uno definitivo.
