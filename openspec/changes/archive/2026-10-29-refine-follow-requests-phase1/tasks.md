## 1. Datos

- [x] 1.1 `listFollowRequestsPage` (fecha, cursor, `requestedAt`, `youFollow`, `total`).
- [x] 1.2 Modo cursor de `GET /api/me/follow-requests`, esquema Zod y `docs/04-api/contracts.md`.

## 2. Página

- [x] 2.1 Metadata, migas, cabecera con cifra y vacíos según la privacidad.
- [x] 2.2 `FollowRequestList`: filas, "Mostrar más", Rechazar con Deshacer, Aprobar con "Seguir de vuelta".

## 3. Cierre

- [x] 3.1 Pruebas de la ruta, la página y la lista.
- [x] 3.2 `docs/05-features/user-profile.md`.
- [x] 3.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px con solicitudes de prueba.
