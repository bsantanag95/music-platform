## 1. Aviso en bienvenida e Inicio

- [x] 1.1 Extender `EmailVerificationNotice` con presentaciones localizadas para bienvenida e Inicio, conservando la interacción de reenvío y los estados de error existentes.
- [x] 1.2 Montar el aviso destacado en `/welcome` antes de las dos puertas y asegurar que el usuario pueda completar o saltar el onboarding sin verificar.
- [x] 1.3 Pasar el estado de verificación del usuario autenticado a `AuthenticatedHome` y mostrar allí el aviso compacto mientras el email esté pendiente.
- [x] 1.4 Mantener el aviso compartido de Ajustes y el estado junto al email en Cuenta y seguridad; comprobar que el texto identifica específicamente el estado del email.
- [x] 1.5 Agregar o actualizar los mensajes en español e inglés sin exponer el adaptador local de consola ni afirmar que la cuenta está bloqueada.

## 2. Pruebas de experiencia

- [x] 2.1 Probar que el aviso aparece para usuarios sin verificar, se oculta para usuarios verificados y conserva el reenvío y su feedback.
- [x] 2.2 Probar bienvenida con email pendiente y que terminar o saltar el onboarding lleva a Inicio sin verificación obligatoria.
- [x] 2.3 Probar Inicio autenticado pendiente/verificado y conservar la cobertura existente del aviso en Ajustes.

## 3. Documentación y validación

- [x] 3.1 Actualizar `docs/02-architecture/auth.md`, `docs/05-features/onboarding.md` y `docs/05-features/home.md` para reflejar las nuevas superficies y el modo soft.
- [x] 3.2 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
