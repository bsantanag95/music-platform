## 1. Datos

- [x] 1.1 Migración `0096_terms_acceptance.sql` + espejo en `schema.ts` + `src/lib/terms.ts` (`TERMS_VERSION`, modos, columnas)
- [ ] 1.2 Aplicar `0096` en la BD de scratch y comprobar el `CHECK` (pendiente de autorización del usuario)

## 2. Backend

- [x] 2.1 `RegisterRequestSchema.acceptTerms` (`z.literal(true)`), `registerUser(input, acceptance)` y la ruta de registro
- [x] 2.2 Cuenta nueva de Google con modo `notice`; exportación de datos con los tres campos

## 3. UI

- [x] 3.1 Casilla en `AuthForm` (registro) con error accesible; `terms-links.tsx`
- [x] 3.2 Aviso bajo el botón de Google en registro y login (`SocialSignIn`, `LoginPanel`); mensajes es/en y `client-messages.json`

## 4. Textos, documentación y pruebas

- [x] 4.1 `/help`, `/terms` («Por definir») y `/privacy` (tabla) en es y en
- [x] 4.2 ADR 0061, `contracts.md`, `sql-model.md`, `auth.md`, `info-pages.md`; smoke de verificación de email con `acceptTerms`
- [x] 4.3 Tests: formulario, página, ruta, servicios, exportación, `TERMS_VERSION`
- [ ] 4.4 `typecheck`, `lint`, `test`, `build` y revisión en el navegador
