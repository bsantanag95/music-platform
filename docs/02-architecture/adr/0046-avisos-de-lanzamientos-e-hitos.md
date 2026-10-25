# ADR 0046 — Avisos de lanzamientos e hitos

## Estado

Aceptado (cambio `add-notification-milestones-and-releases`, 2026-10). Extiende el ADR 0045 (notificaciones in-app
materializadas) sin reescribirlo: mantiene una fila por evento, un único emisor y la retracción por cascada. Se apoya
en el ADR 0029 (el calendario de Inicio sale de ListenBrainz) y en el ADR 0011 (todo ocurre dentro de la request, sin
colas ni eventos).

## Contexto

La Fase 1 dejó seis tipos y una bandeja "Para ti". La Fase 2 agrega dos familias que no encajan en el patrón de la
Fase 1:

- **Hitos propios**: el comentario de alguien llega a una cifra redonda de me gusta, o una lista a una cifra redonda
  de personas que la guardaron. No hay un actor al que avisar ni un evento de otra persona: el aviso es del objeto y
  del destinatario.
- **Lanzamientos de artistas seguidos**: un disco de un artista que la persona sigue salió o está anunciado. El
  destinatario no es el autor de una acción, sino el conjunto de seguidores; el fan-out puede ser de cientos de
  personas y ocurre en una sincronización diaria, no en la request de una persona.

El producto sigue pidiendo avisos **sin presión ni gamificación** y una bandeja que no cambie de comportamiento para
lo que ya funcionaba. Además, el calendario de Inicio ya baja, filtra y verifica lanzamientos (ADR 0029): abrir una
segunda fuente sería duplicar requests, filtros y criterios de calidad.

## Decisión

1. **Cinco tipos nuevos, sin actor.** `comment_like_milestone`, `list_save_milestone`, `artist_release`,
   `artist_release_announced` y `artist_single`. Los dos hitos llevan `milestone` y apuntan a su objeto
   (`comment_id` / `list_id`); los lanzamientos apuntan a `release_group_id`. `chk_notification_actor` exige
   `actor_id IS NULL` en los cinco: un like o un guardado es anónimo y un lanzamiento no tiene una persona detrás.
2. **Hitos en la misma transacción que la fila que los provoca.** `likeComment`, `saveList` y `setListTracking`
   insertan con `ON CONFLICT DO NOTHING … RETURNING`: solo un like o un guardado **nuevo** cuenta, y el conteo usa la
   misma regla que la cifra pública (sin cuentas desactivadas). El hito se emite dentro de esa transacción, así que
   una acción que falla no deja un aviso huérfano.
3. **Solo el hito más alto y una sola vez.** Las escalas son likes `10, 25, 50, 100, 500, 1000, 2500, 5000, 10000` y
   luego cada `10000`; guardados `1, 5, 10, 25, 50, 100, 500, 1000` y luego cada `1000`. Un salto de 9 a 30 avisa
   25, no 10 y 25. El único parcial `(recipient_id, objeto, kind, coalesce(milestone, 0))` absorbe las carreras y
   hace que un re-like no repita el aviso. Un unlike **no retira** el hito: el hecho de que ocurrió no deja de ser
   cierto.
4. **El calendario es la única fuente de lanzamientos.** Después de reemplazar la ventana, la sincronización emite
   con un `INSERT … SELECT … ON CONFLICT DO NOTHING` por tipo. Destinatarios, cuenta activa y preferencia (con su
   defecto) se resuelven en SQL: `credit` (`role = 'primary'`) → `artist_follow` → `app_user` activo →
   `coalesce(preference.enabled, defecto)`. No hay una fila por seguidor en memoria ni una consulta por artista.
   - Álbum o EP de los últimos **14 días** → `artist_release`.
   - Sencillo de los últimos 14 días → `artist_single`.
   - Cualquier tipo con fecha futura → `artist_release_announced`.
   - Una reedición o un tipo secundario ya quedó fuera del calendario: no genera aviso.
5. **Los avisos no bloquean la sincronización.** Se emiten en una transacción propia, después del reemplazo de la
   ventana, dentro de un `try/catch` que registra el fallo y no lo relanza. Si fallan, el calendario ya quedó
   actualizado y la próxima sincronización lo reintenta; los únicos por persona, disco y tipo evitan duplicados.
6. **Los discos de artistas seguidos se vinculan primero.** La cola de verificación y vínculo tiene un tope de 150;
   ordenarla con los seguidos delante evita que el tope deje sin aviso justo a quien sigue al artista.
7. **Sencillos aparte, solo si alguien los pidió.** Del mismo feed se toman los `Single` de artistas seguidos por al
   menos una persona activa con `artist_single` activado. Se verifican y vinculan dentro del mismo tope, pero **no
   entran en `release_calendar_entry` ni en el riel de Inicio**: el calendario y el riel siguen siendo de álbumes y
   EPs. Un sencillo que nadie pidió no se verifica ni se vincula.
8. **Preferencias con defecto por tipo.** `OPTIONAL_NOTIFICATION_KINDS` pasa de lista a mapa `kind → defecto`. La
   ausencia de fila significa el defecto del tipo (antes: activado); se guarda fila solo cuando difiere. Defectos:
   activados `comment_like_milestone` y `artist_release`; desactivados `list_save_milestone`,
   `artist_release_announced` y `artist_single`. Las filas de la Fase 1 no cambian de significado porque entonces
   todos los defectos eran `true` y solo se guardaban desactivaciones. `follow_request` y `moderation` siguen fijas.
9. **Dos pestañas, dos marcas de visto.** "Para ti" conserva el contador, la agrupación y los filtros de la Fase 1.
   "Novedades" reúne los tres tipos de lanzamiento, muestra un **punto sin cifra** y usa
   `app_user.notifications_releases_seen_at`. Abrir "Novedades" mueve solo esa marca; abrir la campana o la página
   mueve la de "Para ti". El contador de la campana nunca suma novedades. `tab` ausente sigue significando "Para ti".
10. **Filtros de lectura para los objetos nuevos.** Un hito de comentario exige el comentario y su raíz visibles; un
    hito de lista exige que la lista siga visible para su dueño; un lanzamiento exige que el disco siga en el
    catálogo y en la discografía (no marcado como fuera). Los destinos llevan al hilo (`?thread=<rootId>`), a la lista
    o al Camino del dueño, o a la página del disco.

## Alternativas consideradas

- **Derivar los hitos al leer** (contar likes o guardados y comparar escalas): repetiría el conteo en cada render y
  no podría distinguir "el hito ocurrió" de "el conteo bajó después"; el unlike borraría el aviso.
- **Emitir una fila por seguidor en memoria**: con cientos de seguidores por artista, la sincronización haría N
  consultas o un `INSERT` gigante construido en JavaScript. El `INSERT … SELECT` deja el fan-out en la base.
- **Una fuente de lanzamientos propia** (consultar MusicBrainz por artista seguido): duplicaría la ventana, los
  filtros de calidad y las requests que el calendario ya hace; además perdería la carátula y la verificación.
- **Meter los sencillos en el calendario y el riel**: cambiaría el comportamiento de Inicio y el significado de la
  ventana "Álbum o EP". Los sencillos viajan aparte y solo se avisan.
- **Sumar las novedades al contador de la campana**: mezclaría dos ritmos (interacciones y lanzamientos) y haría que
  el contador creciera por discos que la persona no provocó. El punto de la pestaña informa sin competir.
- **Guardar todas las preferencias, incluidas las que coinciden con el defecto**: obligaría a un backfill y a
  distinguir filas históricas de filas nuevas. La ausencia como "defecto del tipo" mantiene el significado anterior.
- **Retirar el hito al bajar el conteo**: convertía un hecho pasado en un estado actual y permitía que un unlike
  borrara el aviso de otra persona. Los hitos no se retiran; sí se retiran con su objeto por cascada.

## Consecuencias

- La migración `0076` es aditiva salvo los `CHECK` y el único que se rehacen con la misma regla más amplia; ninguna
  fila de la Fase 1 los viola. No hay backfill: no se inventan hitos ni lanzamientos anteriores.
- Los cinco tipos nuevos se retiran con su objeto: borrar el comentario, la lista o el disco borra el aviso por
  cascada. La cuenta del destinatario también lo borra.
- Un hito puede quedarse "viejo" si el conteo baja y vuelve a subir por debajo del siguiente hito: no se repite el
  que ya se avisó, que es el comportamiento buscado.
- El fan-out de lanzamientos se apoya en `artist_follow` y en el único `(recipient_id, release_group_id, kind)`; la
  sincronización diaria es idempotente y no necesita recordar qué avisó.
- Los defectos hacen que los guardados, los anunciados y los sencillos nazcan apagados: son los avisos más ruidosos o
  menos universales. Quien los quiera los activa en Ajustes → Notificaciones, ahora separados en "Para ti" y
  "Novedades".
- El punto de "Novedades" y el contador de "Para ti" se leen en la misma respuesta de `GET /count`; el layout calcula
  ambos en el servidor y el cliente los refresca cada 60 s como en la Fase 1.
- El coste de la sincronización crece con el número de artistas seguidos y de discos de la ventana, no con el número
  de seguidores; el smoke mide el fan-out de 500 seguidores.
