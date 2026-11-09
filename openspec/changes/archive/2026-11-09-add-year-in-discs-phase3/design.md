## Context

Tercera fase de `add-year-in-discs`. Decisiones tomadas al abrirla (2026-11-09): la invitación aparece en Inicio y en el diario y además llega como aviso;
dura del 1 de diciembre al 15 de enero; "Arma la tuya" lleva al año propio de ese mismo año, con una tercera intención cerrada.

Estado de partida: el año propio en curso existe siempre; un año pasado sin escuchas responde 404 también al dueño. Las intenciones de "Arma la tuya" son
`BuildIntent` (`lamina`, `discography`) en `src/lib/laminas/intent.ts` (ADR 0052 y 0054). Las notificaciones tienen tipos y preferencias cerrados por
`CHECK` (`0075`–`0077`); "Novedades" no suma al contador de la campana. La zona horaria de la persona no se guarda en la cuenta: llega por la cookie `tz`
(y la marca del año guarda la del dueño).

## Goals / Non-Goals

**Goals:**

- Que cada persona con escuchas se entere de su año cuando importa, sin insistir.
- Que quien ve el año de otra persona pueda armar el suyo en un toque, también si se registra en el camino.

**Non-Goals:**

- Un correo propio del año (en el resumen semanal entra como cualquier novedad sin leer, con el mismo texto). "Compárala con la tuya". Recordatorios
  repetidos.

## Decisions

### 1. Ventana

El año que cierra es el año en curso en diciembre y el anterior en enero. La ventana va del 1 de diciembre al 15 de enero, inclusive, calculada con la zona
del pedido (`requestTimeZone()`). Una función pura `yearInvitationFor(now, timeZone)` devuelve el año o `null`; la usan la tarjeta y el script.

### 2. Tarjeta en Inicio y en el diario

Con sesión, dentro de la ventana, si el dueño tiene escuchas en ese año (no ocultas) y no tiene la marca de compartido de ese año: "Tu <año> en discos"
con el texto "hasta ahora" en diciembre, y un enlace a su página del año. Un botón "Descartar" guarda la cookie `year_invite_dismissed=<año>` (un año,
`SameSite=Lax`): el servidor la lee y no la pinta, sin parpadeo. Lo descartado de un año no afecta al siguiente. La comprobación es una consulta acotada
(`EXISTS` de una escucha en el rango del año) más la lectura de la marca.

- **Por qué cookie y no columna:** es una comodidad de una pantalla, no un dato de la cuenta; si se pierde, la tarjeta vuelve a aparecer y se descarta otra
  vez.

### 3. Aviso

Migración `0089`: tipo `year_in_discs` en `notification` (sin actor, en "Novedades"), columna `year SMALLINT` con `CHECK (year BETWEEN 2000 AND 2100)` y
`CHECK` de coherencia (solo ese tipo la usa y siempre la lleva), único parcial `(recipient_id, kind, year) WHERE year IS NOT NULL`, y preferencia
`year_in_discs` (activa por defecto, apagable en las preferencias de notificaciones).

`scripts/send-year-invitations.ts`, programado a diario (`.cmd` para el Programador de tareas, como el resumen semanal). Emite solo si el instante es igual
o posterior al 1 de diciembre a las 12:00 UTC y anterior al 16 de enero a las 12:00 UTC (a esa hora ya es 1 de diciembre en todas las zonas habitadas), para
el año que cierra: a cada cuenta activa con al menos una escucha en ese año (rango UTC; la diferencia de zona solo afecta escuchas del borde y no cambia que
la persona haya escuchado ese año) y con la preferencia activa. `INSERT … ON CONFLICT DO NOTHING` sobre el único: repetir el script no duplica. Enlaza a
`/users/<usuario>/year/<año>`. `--dry-run` cuenta sin escribir.

### 4. "Arma la tuya" en el año

En el año de otra persona (no el dueño): con sesión, enlace a `/users/<yo>/year/<año>`; sin sesión, a `/auth/register?anio=<año>` con enlace al login.
`BuildIntent` suma `{ kind: "year"; year }`: `anio` se acepta solo como entero de 2000 a 2100; cualquier otro valor se descarta. El destino lo arma el código
con el usuario autenticado. Si llegan varias, manda la de Lámina, después la de discografía. En Google viaja en el estado del flujo igual que las otras. ADR
`0055` amplía el `0054`.

### 5. Año propio sin escuchas

El dueño que abre un año entre 2000 y el año en curso sin escuchas recibe la página con un estado vacío ("Aún no tienes escuchas en <año>", lo que es el
año y un enlace al diario para registrar una), sin compartir ni Top 5. Para cualquier otra persona sigue siendo 404. Un año futuro sigue siendo 404.

## Risks / Trade-offs

- **[El aviso llega a quien escuchó poco]** → basta una escucha: el año igual existe y la persona decide; la preferencia lo apaga.
- **[El script no corre un día]** → la ventana es larga y el aviso es idempotente: sale en la siguiente corrida.
- **[Zona aproximada en el script]** → solo decide si hubo escuchas en el año; la página usa la zona real.

## Migration Plan

`0089` en scratch durante el cambio. En la BD real va después de `0079` a `0088`. La tarea programada se registra a mano (`docs/06-operations`).

## Open Questions

Ninguna.
