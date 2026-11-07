# ADR 0054: Intención de discografía al autenticarse

**Estado:** Aceptada (2026-11-07, `add-discography-lamina-phase3`). Amplía el ADR 0052 sin reescribirlo.

## Contexto

El ADR 0052 admite una sola intención cerrada después de autenticarse, el id de una Lámina, y pide que otra intención tenga su propio valor y un ADR que lo
amplíe. "Arma la tuya" en la discografía de otra persona tiene que llevar a la discografía propia de ese artista, para valorar lo que falta, también si la persona se
registra en el camino.

## Decisión

Una **segunda intención cerrada**, con las mismas garantías que la primera:

- El registro, el login y `GET /api/auth/google/start` aceptan `discografia=<uuid>`, el id de un artista. Un valor que no sea un identificador se descarta.
- El destino lo arma el código con el usuario autenticado: `/<locale>/users/<usuario>/artist/<uuid>?valorar=1`. El cliente no aporta el usuario ni la ruta.
- Las dos intenciones son un único valor cerrado con dos formas (`BuildIntent`), validado en un solo módulo. Si llegan las dos, manda la de Lámina.
- En Google viaja en el estado del flujo, solo con la intención `login`, igual que la de Lámina. Una cookie en curso con el campo anterior se sigue leyendo.
- Como la de Lámina, manda sobre `onboarded_at` nula: la bienvenida queda pendiente.

## Alternativas descartadas

- **Un parámetro y un campo por intención:** cada intención nueva repetiría la validación en cinco lugares.
- **Llevar a la página del artista:** no necesita ADR, pero la persona tendría que encontrar sola cómo armar su discografía.

## Consecuencias

- Una tercera intención se suma como otra forma de `BuildIntent`, con su ADR o una ampliación de este.
