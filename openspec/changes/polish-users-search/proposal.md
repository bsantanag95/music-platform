## Why

La búsqueda de usuarios ya funciona, pero su respuesta visual todavía es demasiado genérica y ofrece poco feedback después del submit. La superficie necesita una iteración de producto que haga más reconocibles los perfiles, comunique el estado de la búsqueda y aproveche la paginación que el backend ya expone, sin convertirse en un buscador complejo.

## What Changes

- Mejorar la cabecera y el contexto visual de los resultados, mostrando el término buscado y la cantidad de usuarios cuando corresponda.
- Añadir estados de carga accesibles y skeletons para las tarjetas.
- Mantener el formulario visible cuando ocurre un error y permitir reintentar o cambiar la búsqueda sin perder el contexto.
- Mejorar `UserCard` con una identidad visual derivada del nombre, jerarquía clara entre identidad y acción, y comportamiento responsive para estados sociales largos.
- Añadir paginación progresiva mediante un botón localizado que use `page` y `hasNext` del endpoint existente.
- Persistir el término de búsqueda en `?q=` sin cambiar la ruta `/users` ni redirigir a la búsqueda musical.
- Mantener separados `/users` y `/search`, así como las reglas de privacidad y seguimiento actuales.
- Cubrir los estados y comportamientos nuevos con tests y actualizar la documentación correspondiente.

### Goals

- Hacer que `/users` se sienta como una superficie de descubrimiento social completa.
- Mejorar claridad, feedback, accesibilidad y responsive sin añadir complejidad innecesaria.
- Aprovechar capacidades existentes del endpoint sin modificar su contrato.
- Mantener la experiencia localizada en español e inglés.

### Non-Goals

- No combinar la búsqueda de usuarios con la búsqueda musical.
- No añadir avatares reales, recomendaciones, filtros avanzados, ordenamientos nuevos ni búsqueda instantánea.
- No cambiar el modelo de datos, las reglas de privacidad, los estados de seguimiento ni las rutas de perfil.
- No introducir nuevas dependencias ni reemplazar el manejo local de estado por una librería global.
- No rediseñar la página de perfil de usuario ni otras superficies sociales.

## Capabilities

### New Capabilities

Ninguna. Se mejora una capacidad social existente.

### Modified Capabilities

- `social-profiles`: la búsqueda incorpora feedback de resultados, carga accesible, paginación progresiva y persistencia del término en la URL, conservando la exposición mínima de perfiles públicos y privados.

## Impact

- Componentes: `src/app/[locale]/users/page.tsx`, `src/components/social/UserSearch.tsx`, `src/components/social/UserCard.tsx` y posibles primitivas UI reutilizables.
- API cliente: uso de `GET /api/users?q=&page=&pageSize=` y `UserSearchResponseSchema` existentes; no se modifica el contrato REST.
- Traducciones: `messages/{es,en}/users.json`.
- Tests de página, búsqueda, tarjetas, estados, paginación y consistencia i18n.
- Documentación: especificación `social-profiles` y documentación de la feature social.
