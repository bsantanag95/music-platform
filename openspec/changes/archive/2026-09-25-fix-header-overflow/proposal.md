## Why

Con sesión, la fila del Header de escritorio no entra entre 768 px (`md`) y ~835 px para
cualquier usuario, ni hasta ~1.070 px para una cuenta con permisos de moderación y
administración: logo, buscador, seis enlaces, "Registrar", idioma y nombre suman más que el
ancho disponible y toda la página gana desplazamiento horizontal.

## What Changes

- El panel colapsado del Header pasa del punto de corte `md` a `lg` (1024 px).
- Moderación y Administración salen de la barra general y pasan al menú de usuario (y al
  bloque de usuario del panel colapsado), en un grupo "herramientas" visible solo con el
  permiso correspondiente.

## Goals

- Ningún desplazamiento horizontal por el Header en ningún ancho.
- Barra general limitada a navegación de contenido, como ya pide la spec.

## Non-Goals

- Rediseñar el Header, el buscador o el menú de usuario.
- Cambiar permisos o rutas de moderación y administración.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `cross-view-navigation`: punto de corte del panel colapsado (`lg`) y ubicación de las
  herramientas de rol en el menú de usuario.

## Impact

- `src/components/layout/Header.tsx`, `UserMenu.tsx`, `user-menu-items.ts` y sus tests.
- Sin cambios de API, esquema ni dependencias.
