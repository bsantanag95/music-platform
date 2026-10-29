## 1. Datos

- [x] 1.1 `listSentRequestsPage`, `countSentRequests` y `approveAllRequests`.
- [x] 1.2 `GET /api/me/follow-requests/sent` y `POST /api/me/follow-requests/approve-all`; esquemas;
  `docs/04-api/contracts.md`.

## 2. Página

- [x] 2.1 Pestañas Recibidas · Enviadas con cifras (`?tab=sent`).
- [x] 2.2 `SentRequestList`: filas, "Mostrar más", Cancelar con Deshacer diferido.
- [x] 2.3 "Aprobar todas" con confirmación y menú ⋯ con Ver perfil y Bloquear.

## 3. Cierre

- [x] 3.1 Pruebas de servicios por ruta, la página y las listas; SQL contra Postgres con un fixture de prueba.
- [x] 3.2 `docs/05-features/user-profile.md`.
- [x] 3.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px.
