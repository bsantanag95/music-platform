## 1. Datos

- [x] 1.1 `listConnectionsPage` (cursor por `username`) y `getConnectionsSummary` (avatar + cifras).
- [x] 1.2 `GET /api/users/{username}/connections/{kind}` + esquema Zod + `docs/04-api/contracts.md`.

## 2. Página

- [x] 2.1 Cabecera con migas, avatar, `h1`, subtítulo y cifras en las pestañas; metadata.
- [x] 2.2 `ConnectionRow` y menú ⋯; "Mostrar más".
- [x] 2.3 Confirmar "Eliminar seguidor" y Deshacer diferido.
- [x] 2.4 Vacíos y aviso de perfil privado con seguir.

## 3. Cierre

- [x] 3.1 Pruebas de la vista, la ruta y la lista (filas, confirmar, Deshacer diferido, Mostrar más).
- [x] 3.2 `docs/05-features/user-profile.md`.
- [x] 3.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px.
