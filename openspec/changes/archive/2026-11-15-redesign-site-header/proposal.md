## Why

El rediseño de la portada pública (dirección «C · Disquería», `redesign-anon-home-phase1..3`) cambió solo el comportamiento de la cabecera
en pantallas angostas. En escritorio sigue como en la auditoría del 2026-11-14: la marca es un cuadrado sin nombre, el buscador —la tarea
principal del producto— es un campo de 160 px que se pierde entre los enlaces, la navegación y los botones de cuenta van en monoespaciada de
12–14 px y la acción principal dice «Registrarse» mientras el hero dice «Crear cuenta». La cabecera es global, así que se trata aparte.

## What Changes

- **Composición del mockup C:** marca y navegación a la izquierda, **buscador ancho y fluido en el centro**, cuenta a la derecha (cambia el
  orden fijado en `cross-view-navigation`).
- **Marca con nombre:** monograma + `appName` desde `sm`; en móvil, solo el monograma.
- **Navegación en Space Grotesk** (no en IBM Plex Mono), con fondo suave al pasar el cursor y el subrayado ámbar de la sección actual.
- **Cuenta sin sesión:** «Iniciar sesión» secundaria y «Crear cuenta» principal, de 40 px de alto.
- **Atajo `/`** que enfoca el buscador (o abre su fila en pantallas angostas), con la pista dentro del campo.
- Selector de idioma, «Añadir», campana y menú de usuario conservan su lógica; solo se ajustan alturas y espaciado para alinear la fila.
- **Corrección de spec:** el requisito del panel colapsado seguía diciendo que contiene el buscador; desde la Fase 1 tiene su propio
  control.
- **DESIGN.md:** la navegación pasa a la tipografía de interfaz.

### Goals

- Que el buscador sea el elemento más visible de la cabecera en escritorio.
- Una cabecera coherente con la portada sin cambiar sus destinos, su lógica ni las fuentes de la aplicación.

### Non-Goals

- Cambiar tipografías globales (análisis pendiente en `docs/05-features/home.md`).
- Cambiar destinos, el menú de usuario, el diálogo «Añadir» o las notificaciones.
- Un logo definitivo: el monograma sigue siendo provisional.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `cross-view-navigation`: nuevo orden de la barra general y corrección del panel colapsado; requisitos nuevos para la marca y las
  acciones de cuenta sin sesión.
- `header-search`: requisitos nuevos para el buscador a todo el ancho disponible y el atajo `/`.

## Impact

`src/components/layout/{Header,Logo,HeaderSearch}.tsx`, `src/components/catalog/ScopedSearchField.tsx` (variante del Header fluida y pista
del atajo), ajustes de altura en `QuickActionsButton`/`UserMenu` si hace falta; mensajes `messages/{es,en}/common.json`;
`client-messages.json`; tests de `Header`, `HeaderSearch`, `Logo`; `DESIGN.md` (Navigation) y `docs/05-features/phase-5-design.md` §10.1.
Sin API, esquema ni dependencias. Afecta a todas las páginas; no afecta a páginas informativas ni legales.
