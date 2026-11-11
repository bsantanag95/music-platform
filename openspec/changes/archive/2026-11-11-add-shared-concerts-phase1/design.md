## Context

- `concert_entry` (migración `0091`, ADR 0056) es el recuerdo de una persona: artista, fecha parcial, lugar escrito a
  mano, enlace opcional a setlist.fm y audiencia. El ADR dejó previsto un enlace opcional a un concierto real, sin
  sobrescribir lo escrito.
- El catálogo sigue el patrón de cacheo bajo demanda: la base propia primero y MusicBrainz solo si falta, por el único
  cliente (`src/services/musicbrainz/client.ts`, cola de ≥1,1 s, User-Agent obligatorio). La discografía y la ficha del
  artista ya se refrescan en segundo plano con `after()`.
- Spike del 2026-11-11 sobre 13 artistas (`/ws/2/event?artist=…&inc=place-rels+area-rels+artist-rels`): 97–100 % de
  eventos con fecha completa y recinto; cobertura de cientos en artistas anglo grandes y casi nula en el catálogo latino.
  Tipos: `Concert`, `Festival` y otros que no son conciertos (`Award ceremony`, `Convention/Expo`, `Stage performance`,
  `Launch event`). El recinto llega como relación `held at` a un `place` con nombre y `area` (casi siempre una ciudad,
  sin código de país). Los artistas llegan como relaciones `main performer`, `support act` o `guest performer`; los
  festivales vienen por día y escenario y traen decenas de artistas.

## Goals / Non-Goals

**Goals (Fase 1):** entidad compartida, semilla de MusicBrainz, pestaña y página, "Estuve ahí", personas que estuvieron.

**Non-Goals:** creación comunitaria, confirmación, moderación y duplicados (Fase 2); sugerencias de enlace, desvincular,
navegación de festivales y aporte a MusicBrainz (Fase 3).

## Decisions

### D1. Recuerdo personal y concierto compartido son entidades distintas

`concert` es el hecho compartido; `concert_entry` sigue siendo el recuerdo de cada persona y gana `concert_id` opcional
(`ON DELETE SET NULL`). "Estuve ahí" copia los datos del concierto al registro personal una sola vez, como valores
iniciales; desde ahí son de la persona (puede corregir el recinto o agregar una nota) y una actualización posterior del
concierto no los pisa. Así se cumple el ADR 0056 y borrar un concierto (por moderación, en la Fase 2) no borra recuerdos.
Un único `(user_id, concert_id)` por persona: no se puede "estar" dos veces en el mismo concierto.

### D2. Orígenes y estado del concierto, preparados para la Fase 2

`concert.source IN ('musicbrainz', 'community')` y `concert.status IN ('confirmed', 'pending', 'hidden')`. En la Fase 1
solo existen conciertos de MusicBrainz, que nacen `confirmed`: ya pasaron por la comunidad y la moderación de MusicBrainz.
Un `CHECK` exige `mbid` cuando el origen es MusicBrainz. Las lecturas públicas filtran `status = 'confirmed'` desde ya,
para que la Fase 2 no cambie ninguna consulta.
*Alternativa descartada:* tablas separadas por origen; duplicaría todas las lecturas y el enlace del registro personal.

### D3. Qué se importa de MusicBrainz

- Solo tipos `Concert` y `Festival`; los demás no son conciertos.
- Solo eventos con fecha **completa** (`YYYY-MM-DD`): un concierto compartido tiene una fecha exacta, que es lo que
  permite reconocerlo y, en la Fase 2, detectar duplicados. Se pierde ~3 % de los eventos del spike.
- Los cancelados se guardan con `cancelled = true` (para no reimportarlos como nuevos) pero no se listan.
- Nombre del evento tal como viene ("M72 World Tour: Mexico City", "Vive Rock 2023").
- Recinto: el nombre del `place` de la relación `held at` y su `mbid`; ciudad: el nombre del `area` del `place` (o de una
  relación de área directa si no hay `place`). País: el código ISO si el área es un país; si no, `NULL` (D4).
- Artistas: cada relación `main performer` / `support act` / `guest performer` en `concert_performer` con su rol, `mbid`
  y nombre. `artist_id` se llena solo si el artista ya está en el catálogo: **no se crean stubs** (un festival traería
  decenas). Al sincronizar otro artista o al crear un stub por otra vía, un paso de enlace por `mbid` completa `artist_id`.
- Las fechas futuras se guardan (giras anunciadas) y se muestran como "Próximos", sin "Estuve ahí".

### D4. País del recinto

MusicBrainz da la ciudad sin país (la jerarquía de áreas requiere otra request por área). En la Fase 1 el país queda
`NULL` cuando el área no es un país y se guarda el `area_mbid`; la vista muestra recinto y ciudad. Resolver el país por
un caché de áreas (una request por ciudad nueva) queda para la Fase 2, donde la detección de duplicados lo necesita.

### D5. Sincronización bajo demanda, como la discografía

Al abrir la pestaña Conciertos de un artista:
- Si nunca se sincronizó, se pide la primera página (100 eventos) antes de responder, para no mostrar una pestaña vacía
  que no lo está; el resto de las páginas sigue en segundo plano (`after()`), hasta un tope de 1.000 eventos.
- Si pasaron más de 30 días, se refresca en segundo plano y se muestra lo guardado.
- `artist.concerts_synced_at` marca el último recorrido completo. Una sincronización interrumpida no lo marca.
- Upsert por `mbid`; los artistas de cada concierto se reemplazan en bloque. Un evento que desaparece de MusicBrainz no
  se borra (puede tener asistentes): queda como está.
- Un fallo de MusicBrainz no rompe la pestaña: muestra lo guardado o el estado vacío.
- La pestaña no se condiciona a tener conciertos (eso exigiría consultar MusicBrainz en cada visita a la cabecera): existe
  siempre para grupos y personas, con un estado vacío que invita a registrar el concierto en Mis conciertos.

### D6. "Estuve ahí"

`POST /api/concerts/{id}/attendance`:
- Concierto inexistente, no confirmado, cancelado o futuro → error y nada se crea.
- Si la persona ya está enlazada a ese concierto → devuelve su registro (idempotente).
- Si tiene un registro propio **sin enlazar** del mismo artista y la misma fecha exacta → lo enlaza (no duplica).
- Si no, crea un registro con el artista de contexto (el de la pestaña) o, desde la página del concierto, el primer
  artista principal que esté en el catálogo; fecha, recinto, ciudad y país del concierto; audiencia por defecto del
  usuario.
- `DELETE` del mismo recurso quita el **enlace** y el registro solo si lo creó "Estuve ahí" y la persona no lo cambió
  (mismo `created_at` y `updated_at`); si lo editó, solo desenlaza. Así no se pierde lo escrito.

### D7. Personas que estuvieron

- La cifra cuenta personas distintas con un registro enlazado, cuentas activas, cualquier audiencia (no identifica a
  nadie). Igual que los agregados de comunidad del álbum: con menos de 5 se muestra "Menos de 5 personas".
- La lista de personas en la página del concierto muestra solo los registros que el visitante puede ver según la matriz
  de visibilidad de la colección (audiencia del registro, perfil privado, seguimiento, bloqueo en ambos sentidos), cuentas
  activas, hasta 50 con "y N más".

### D8. Rutas y lectura

- Pestaña: segmento `concerts` del artista, Server Component; agrupa por año (próximos arriba), 50 por página con
  `?pagina=`.
- Página: `/concert/{id}` con slug como el resto del catálogo, Server Component; `notFound()` si no existe o no está
  confirmado.
- API de lectura para el cliente solo donde hace falta (estado de "Estuve ahí" tras la acción); la carga inicial es del
  servidor.

## Risks / Trade-offs

- [Cobertura despareja] → la pestaña puede estar vacía para el catálogo latino hasta la Fase 2; el estado vacío lo dice y
  lleva a Mis conciertos.
- [Requests a MusicBrainz] → solo al abrir la pestaña, una por cada 100 eventos, con tope de 1.000 y refresco cada 30
  días; misma cola que el resto.
- [Festivales con decenas de artistas] → sin stubs; el cartel muestra los no catalogados como texto.
- [Datos de MusicBrainz que cambian] → el registro personal no se pisa (D1); el concierto sí se actualiza.
- [País vacío en la mayoría] → aceptado en la Fase 1 (D4).

## Migration Plan

Migración `0092` aditiva (tablas nuevas, columnas opcionales, sin backfill). Rollback: revertir el código; las tablas
pueden quedar.

## Open Questions

- Umbral de confirmación de la Fase 2 (propuesta: 3 personas independientes o una prueba externa). Se decide en esa fase.
