## Why

"Tu año en discos" ya se arma y se cura (Fases 1 y 2), pero nadie llega a él si no lo busca, y quien lo ve en otra persona no tiene cómo armar el suyo. El
momento natural es diciembre (`docs/05-features/sharing.md` §4.4.1: "se publica en diciembre y el usuario elige qué entra") y el bucle viral (§6) pide
"Arma la tuya". Es la tercera y última fase de `add-year-in-discs`.

## What Changes

- **Invitación de diciembre:** del 1 de diciembre al 15 de enero, en la zona de la persona, Inicio y el diario muestran una tarjeta "Tu <año> en discos"
  del año que cierra, a quien tiene escuchas ese año y todavía no lo compartió. Se puede descartar (por año).
- **Aviso:** el 1 de diciembre, una notificación en "Novedades" (`year_in_discs`) a quien tiene escuchas ese año, una sola vez por año, con su
  preferencia (activa por defecto). La emite un script diario idempotente.
- **"Arma la tuya" en el año de otra persona:** con sesión lleva a tu año de ese mismo año; sin sesión, al registro con una tercera intención cerrada
  `anio=<año>` (amplía el ADR 0054 con un ADR nuevo), también con Google.
- **Año propio sin escuchas:** el dueño ya no recibe 404 en un año pasado sin escuchas: ve un estado vacío que explica que el año sale de su diario y
  lleva a registrar una escucha.
- Migración `0089` (tipo y preferencia `year_in_discs`, columna `notification.year` y su único).

Fuera de esta fase: un correo propio del año (en el resumen semanal entra como cualquier novedad sin leer), "Compárala con la tuya" (§4.4.2), canciones
en el Top 5.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `year-laminas`: "Arma la tuya" en un año, año propio sin escuchas.
- `notifications`: aviso de "Tu año en discos".
- `home`: invitación de diciembre en Inicio (y en el diario).

## Impact

- **Base de datos:** migración `0089`.
- **Código:** `src/lib/laminas/intent.ts` (forma `year`), registro, login y Google; página del año (llamado y estado vacío); Inicio y diario (tarjeta);
  `src/services/notifications/` (tipo, preferencia, lectura); `scripts/send-year-invitations.ts` y su `.cmd`.
- **Dependencias:** ninguna.
- **Docs:** ADR `0055`, `sharing.md`, `business-rules.md`, `domain-model.md`, `03-data/sql-model.md`, `04-api/contracts.md`, `06-operations` (tarea
  programada).
