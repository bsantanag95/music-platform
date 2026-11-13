# ADR 0052: Intención de Lámina al autenticarse

**Estado:** Aceptada (2026-11-07, `add-top-n-lamina-phase3`). Acota la regla de retorno fijo de `auth.md` sin reemplazarla.

## Contexto

"Arma la tuya" tiene que llevar a quien ve una Lámina ajena a armar la suya, también si para eso se registra. La autenticación tiene una regla escrita: el
destino es fijo y no se acepta una URL de retorno del cliente, para no abrir una redirección. El documento de Compartir proponía un `next=` en `/welcome`
que nunca existió y que chocaría con esa regla.

## Decisión

El retorno sigue sin aceptar URL. Se agrega **una intención cerrada**: el identificador de una Lámina.

- El registro, el login y `GET /api/auth/google/start` reciben `lamina=<uuid>`. Un valor que no sea un identificador se descarta sin interrumpir el flujo.
- El destino lo arma el código: `/<locale>/me/cards?desde=<uuid>`. El cliente aporta el identificador, nunca la ruta.
- En Google viaja en el estado del flujo, protegido por `state`, PKCE y `nonce`, solo con la intención `login`. El callback no lo lee de su query.
- La intención manda sobre `onboarded_at` nula: quien llega así no pasa por `/welcome`, que sigue pendiente y que Inicio sigue ofreciendo.
- Abrir el destino no da acceso a nada: la Lámina se lee con las reglas de su página pública.

## Alternativas descartadas

- **`next=` con lista de rutas permitidas:** cada ruta nueva agranda lo que hay que validar, y un error en esa lista es una redirección abierta.
- **Formato y tipo en la URL:** también son valores cerrados, pero pierden el título y el enlace de vuelta.
- **Pasar por `/welcome` y seguir:** tres pasos entre el impulso y la Lámina, para algo que no necesita valoraciones.

## Consecuencias

- Una intención futura, como la de la lámina de discografía, necesita su propio valor cerrado y su propio ADR o una ampliación de este.
- La intención se pierde en la recuperación de contraseña y en la verificación de email: son desvíos poco frecuentes y la persona cae en su flujo normal.
