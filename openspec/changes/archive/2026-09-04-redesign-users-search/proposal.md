## Why

La búsqueda de usuarios cumple una función distinta de la búsqueda del catálogo musical: descubre personas y habilita relaciones sociales, mientras que `/search` descubre artistas y álbumes. Mantenerlas separadas conserva esa claridad, pero la entrada actual en el Header hace competir una navegación secundaria con el buscador musical y la pantalla `/users` todavía no expresa visualmente su carácter comunitario.

## What Changes

- Mantener `/users` como buscador independiente de `/search`, sin combinar resultados ni modificar el contrato de búsqueda musical.
- Renombrar la terminología visible de `Personas` a `Usuarios` en español y mantener el equivalente localizado en inglés.
- Retirar el enlace directo a Usuarios del Header.
- Incorporar un acceso contextual a Usuarios desde la experiencia de Home y conservar el acceso permanente desde el Footer.
- Rediseñar la pantalla `/users` y sus resultados para que sean más atractivos, claros y coherentes con la identidad visual existente, manteniendo el flujo simple de buscar y mostrar resultados debajo.
- Mejorar la jerarquía visual de las tarjetas de usuario, los estados vacío, error y carga, y la adaptación a móvil y escritorio.
- Mantener las acciones sociales existentes, la visibilidad de perfiles públicos y privados y la navegación a `/users/[username]`.

### Goals

- Hacer evidente que Usuarios es una superficie de descubrimiento social distinta del catálogo.
- Darle a la búsqueda una ubicación más contextual sin perder discoverability.
- Mejorar la legibilidad y el atractivo visual sin añadir datos que el modelo actual no proporciona.
- Preservar accesibilidad, i18n y el comportamiento actual de búsqueda y seguimiento.

### Non-Goals

- No unificar la búsqueda musical y la búsqueda de usuarios.
- No cambiar rutas públicas, endpoints, modelo de datos ni reglas de privacidad.
- No añadir avatares, recomendaciones algorítmicas, filtros avanzados ni búsqueda en tiempo real.
- No rediseñar perfiles, feed, listas ni el resto de las superficies sociales fuera de los puntos de entrada necesarios.

## Capabilities

### New Capabilities

Ninguna. El cambio mejora y reubica una capacidad social existente.

### Modified Capabilities

- `social-profiles`: la búsqueda de usuarios conserva su comportamiento funcional, pero cambia su presentación, nomenclatura visible y puntos de entrada dentro del sitio.

## Impact

- Componentes: `src/app/[locale]/users/page.tsx`, `src/components/social/UserSearch.tsx`, `src/components/social/UserCard.tsx`, `src/components/home/QuickLinks.tsx` y `src/components/layout/Header.tsx`.
- Traducciones: `messages/{es,en}/users.json`, `common.json` y posiblemente `footer.json`.
- Tests de componentes y navegación asociados a Header, Home, UserSearch y UserCard.
- No se requieren dependencias nuevas, migraciones ni cambios de API.
