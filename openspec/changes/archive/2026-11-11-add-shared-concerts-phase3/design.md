## Context

- `concert_entry` es el recuerdo de la persona (ADR 0056): fecha parcial (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`), ciudad y
  país libres, enlace opcional `concert_id` (uno por persona y concierto) y `from_concert` (lo creó "Estuve ahí").
- `concert` (ADR 0057 y 0058): fecha exacta, `city_key` generada con `search_key`, estados `confirmed` / `pending` /
  `hidden`, cartel en `concert_performer` (por `artist_id` o `artist_mbid`). "Estuve ahí" ya enlaza un recuerdo del
  mismo artista y la misma fecha exacta; la confirmación de uno por confirmar se reevalúa al sumar personas.
- Spike del 2026-11-11 sobre `/ws/2/event?artist=…&inc=event-rels+series-rels`: en Metallica 88 de 100 eventos traen
  una serie de tipo `Tour` (el resto `Festival` o `Event series`), 5 de 100 traen más de una; 7 de 100 son días o
  escenarios con la relación `parts` hacia su festival (también hay `rescheduled as` y otras). La relación trae el `id`,
  el nombre, el tipo y el rango de fechas del evento relacionado, pero no su recinto. En festivales grandes el cartel
  está repartido en los días y escenarios (el padre de Glastonbury 2019 tiene un solo artista y 39 partes); en el
  catálogo latino casi no hay giras ni festivales en MusicBrainz.
- MusicBrainz admite precargar `/event/create` con parámetros GET con el nombre de cada campo del formulario (documentado
  en "Development/Seeding", sin la lista de campos del evento).

## Goals / Non-Goals

**Goals:** sugerencias de enlace con descarte, desvincular, giras y festivales navegables, gira en el recuerdo, enlace de
alta en MusicBrainz.

**Non-Goals:** ver la propuesta (sugerencias desde recuerdos ajenos, país por áreas, avisos, ediciones de festivales,
edición comunitaria, escritura en MusicBrainz desde el servidor).

## Decisions

### D1. Qué se sugiere

Para cada recuerdo **sin enlazar** de la persona, un concierto compartido es sugerencia si:
- es visible con sesión (confirmado o por confirmar, no oculto, no cancelado) y pasado;
- el artista del recuerdo está en su cartel (por `artist_id` o por `mbid`);
- la fecha es compatible: un recuerdo con día exacto acepta el concierto de ese día o del anterior o el siguiente
  (funciones pasada la medianoche, zonas horarias); uno con mes, cualquier día de ese mes; uno con solo el año,
  cualquier día de ese año;
- el lugar es compatible: si el recuerdo tiene ciudad, `concert.city_key = search_key(entry.city)`; si no tiene ciudad,
  solo se sugiere con día exacto (con fecha parcial y sin ciudad, una gira entera calzaría); si los dos tienen país,
  coincide;
- la persona no lo descartó para ese recuerdo ni tiene ya otro recuerdo enlazado a ese concierto.

Hasta 3 por recuerdo (primero el de fecha más cercana) y hasta 20 en el bloque, con "y N más" si hay más. Solo usa datos
de la propia persona y conciertos que ya puede ver: no revela nada ajeno.
*Alternativas descartadas:* sugerir sin ciudad con fecha parcial (demasiado ruido en artistas que giran); enlazar solo
(nunca se toca lo de la persona sin su gesto).

### D2. Enlazar y descartar

- "Enlazar" (`POST /api/me/concerts/{id}/link` con `concertId`) valida en el servidor las mismas condiciones de D1
  (salvo el descarte) y si no se cumplen responde `400 CONCERT_LINK_INVALID`; si la persona ya tiene otro recuerdo en
  ese concierto, `409 CONCERT_LINK_CONFLICT`. No modifica nada de lo escrito (ADR 0056): la fecha parcial queda parcial.
  Cuenta como asistencia: reevalúa la confirmación de uno por confirmar.
- "No es este" (`POST /api/me/concerts/{id}/dismissals`) guarda el par en `concert_link_dismissal`; idempotente. Borrar
  el recuerdo o el concierto borra el descarte.

### D3. Desvincular

`DELETE /api/me/concerts/{id}/link`: quita el enlace, pone `from_concert = false` (el recuerdo ya no se borra al "Quitar"
porque no está enlazado) y registra el descarte para no volver a sugerirlo. Nunca borra el recuerdo, a diferencia de
"Quitar" en la página del concierto (que borra uno creado por la acción y sin editar). La confirmación del concierto no
cambia (pegajosa, ADR 0058).

### D4. Giras

- `concert_series`: `mbid` único, `name`; solo series de tipo `Tour`. `concert.series_id` (`ON DELETE SET NULL`). Si un
  evento tiene más de una gira, la primera que trae MusicBrainz (el `ordering-key` de la relación es el orden de la fecha dentro de la gira, no una prioridad entre giras).
- Página `/{locale}/tour/{slug}`: nombre, artistas principales (los de sus conciertos), sus conciertos visibles por
  fecha (próximos y pasados, con cifra de personas con umbral y "Estuve ahí"), cuántas fechas y, con sesión, en
  cuántas estuviste. Sin conciertos visibles responde 404.
- La pestaña del artista y la página del concierto muestran "Gira: <nombre>" enlazado.
- "Estuve ahí" que **crea** un recuerdo copia el nombre de la gira en `tour` (recortado a 100); enlazar un recuerdo
  existente no lo toca.

### D5. Festivales

- Un evento hijo con la relación `parts` (dirección `backward`) hacia un evento de tipo `Festival` guarda a ese padre
  como concierto de MusicBrainz (`kind = 'festival'`, nombre, `event_date` = inicio, `end_date` = fin, sin cartel ni
  recinto) si no existe, y se enlaza con `parent_id`. Si el padre ya existe (importado por su propio cartel) no se pisan
  sus datos; solo se completa `end_date` si faltaba. Se ignoran las demás relaciones entre eventos (`rescheduled as`…).
- `end_date` también se guarda para los festivales importados directamente (fin del `life-span`).
- Página del festival (la del concierto padre): rango de fechas, sus días y escenarios conocidos agrupados por día (cada
  uno con recinto y "Estuve ahí"), el cartel reunido de sus partes (sin repetir artista) y el recinto si todas las partes
  coinciden. El padre no tiene "Estuve ahí" (un recuerdo es de un artista): se dice en cada día.
- La página de un día o escenario muestra "Parte de <festival>". El padre no aparece en la pestaña de un artista salvo
  que tenga cartel propio.

### D6. Agregar a MusicBrainz

En un concierto de la comunidad confirmado, con sesión, un enlace discreto "Agregar a MusicBrainz ↗" a
`https://musicbrainz.org/event/create` precargado con el nombre, el tipo `Concert`, la fecha y, como nota de edición,
el enlace del setlist si lo hay. Lo construye una función en `src/services/musicbrainz/` (no se arman URLs de
MusicBrainz en otro lugar). El recinto y los artistas se agregan en MusicBrainz (su formulario los pide como
relaciones). La primera tarea verifica en el formulario los nombres de los campos; uno que no se pueda precargar se
omite. El servidor no envía nada a MusicBrainz. Cuando el evento exista allá, la fusión automática de la Fase 2 integra
el de la comunidad en el próximo refresco del artista.

## Risks / Trade-offs

- [Sugerencias equivocadas en giras largas] → ciudad obligatoria con fecha parcial, tope de 3 por recuerdo, descarte.
- [Festivales con el cartel solo en el padre o solo en partes] → el cartel reunido usa el del padre y el de las partes.
- [Padre sin recinto] → se muestra el de las partes si coinciden; si no, ninguno.
- [Nombres de campos de MusicBrainz no documentados] → tarea de verificación; un campo que no se precarga se omite y el
  enlace sigue llevando al formulario.
- [Datos existentes sin gira ni festival hasta el refresco] → se completan solos en ≤30 días; quien quiera adelantarlo
  puede vencer `artist.concerts_synced_at` (anotado en la documentación operativa).

## Migration Plan

Migración `0095` aditiva (tablas y columnas nuevas, `CHECK` que las filas existentes cumplen). Sin relleno: el refresco
de cada artista completa gira, festival y `end_date`. Rollback: revertir el código.

## Open Questions

Ninguna bloqueante.
