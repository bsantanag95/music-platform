# ADR 0055: Intención de año al autenticarse

**Estado:** Aceptada (2026-11-09, `add-year-in-discs-phase3`). Amplía el ADR 0054 sin reescribirlo.

## Contexto

El ADR 0054 dejó las intenciones de "Arma la tuya" como un único valor cerrado con varias formas (`BuildIntent`) y pidió que una tercera se sumara como otra
forma, con su ADR. "Arma la tuya" en el año en discos de otra persona tiene que llevar al año propio de ese mismo año, también si la persona se registra en el
camino. A diferencia de las otras dos, el objeto no es un identificador sino un año.

## Decisión

Una **tercera forma** de `BuildIntent`, `{ kind: "year", year }`, con las mismas garantías:

- El registro, el login y `GET /api/auth/google/start` aceptan `anio=<año>`. Solo vale un entero de cuatro cifras entre 2000 y 2100, el rango de "Tu año en
  discos"; cualquier otro valor se descarta y el flujo sigue sin intención.
- El destino lo arma el código con el usuario autenticado: `/<locale>/users/<usuario>/year/<año>`. El cliente no aporta el usuario ni la ruta.
- Si llegan varias intenciones, manda la de Lámina, después la de discografía y al final la de año.
- En Google viaja en el estado del flujo, solo con la intención `login`, igual que las otras, y se revalida al volver.
- Manda sobre `onboarded_at` nula: la bienvenida queda pendiente.
- Como quien llega recién registrado no tiene escuchas, la página del año propio deja de responder 404 a su dueño en un año pasado sin escuchas (hasta el año
  en curso): muestra un estado vacío que lleva al diario. Para cualquier otra persona sigue siendo 404.

## Alternativas descartadas

- **Llevar al diario:** la persona no vería el año que la trajo hasta tener escuchas; el estado vacío del año explica lo mismo y queda en el lugar correcto.
- **Mostrar el llamado solo a quien ya tiene escuchas ese año:** dejaría fuera justo a quien llega desde una imagen compartida, que es el bucle viral.

## Consecuencias

- Una cuarta intención se suma como otra forma de `BuildIntent`, con su ADR o una ampliación de este.
