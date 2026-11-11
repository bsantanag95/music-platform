# ADR 0059: Giras, festivales y sugerencias de enlace de conciertos

**Estado:** Aceptada (2026-11-11, `add-shared-concerts-phase3`). Cierra la Fase 3 del ADR 0057 sin reescribirlo.

## Contexto

Tras las Fases 1 y 2 (ADR 0057 y 0058), los recuerdos de Mis conciertos solo se enlazaban si la persona pulsaba "Estuve
ahí" en el concierto exacto, no había forma de deshacer un enlace sin perder el recuerdo y los conciertos se mostraban
sueltos. Un spike del 2026-11-11 sobre el browse de eventos con `inc=series-rels+event-rels` mostró que MusicBrainz
asigna una gira (serie de tipo `Tour`) a casi todos los conciertos de los artistas grandes (88 de 100 en Metallica) y
relaciona los días y escenarios con su festival (`parts`, 7 a 10 de cada 100), con el cartel repartido en las partes.

## Decisión

1. **Sugerencias solo con lo propio.** Mis conciertos sugiere, para cada recuerdo sin enlazar, conciertos visibles con
   sesión del mismo artista con fecha compatible (día exacto ±1, mismo mes o mismo año) y la misma ciudad normalizada
   (obligatoria si la fecha no es exacta), hasta 3 por recuerdo. Se descartan para siempre con "No es este"
   (`concert_link_dismissal`). **No** se sugiere crear un concierto a partir de recuerdos de otras personas: aun como
   cifra revelaría recuerdos privados ajenos; en cuanto alguien lo comparte, las sugerencias alcanzan a los demás.
2. **Enlazar no toca lo escrito** (ADR 0056): la fecha parcial queda parcial. Cuenta como asistencia y puede confirmar uno
   por confirmar (ADR 0058). El servidor valida las mismas condiciones de la sugerencia.
3. **Desvincular conserva el recuerdo**: quita el enlace, deja de tratarlo como creado por "Estuve ahí" y lo descarta como
   sugerencia. La confirmación del concierto no cambia (pegajosa).
4. **Giras y festivales salen de la misma request.** La gira es la primera serie de tipo `Tour` del evento
   (`concert_series`, `concert.series_id`). El festival padre de un día o escenario se guarda como concierto de
   MusicBrainz sin cartel ni recinto y con rango de fechas (`end_date`), y la parte lo enlaza (`parent_id`); un padre que
   ya existe no se pisa. Las demás relaciones entre eventos se ignoran. Lo ya importado se completa en el refresco de 30
   días, sin relleno.
5. **Festival sin "Estuve ahí" propio**: un recuerdo es de un artista, así que se dice en cada día o escenario. La página
   del festival reúne sus partes por día y su cartel. "Estuve ahí" que crea un recuerdo copia el nombre de la gira como
   valor inicial.
6. **Aportar a MusicBrainz sin escribir desde el servidor.** Un concierto de la comunidad confirmado ofrece un enlace al
   formulario `/event/create` precargado por GET (campos de `MusicBrainz::Server::Form::Event`: nombre, tipo `1` =
   Concert, fechas, terminado; el setlist como nota de edición). La persona lo completa con su cuenta; la fusión
   automática de la Fase 2 integra el evento cuando existe.

## Consecuencias

- El catálogo latino casi no tiene giras ni festivales en MusicBrainz: ahí la ganancia es la de las sugerencias.
- El formulario de MusicBrainz exige iniciar sesión; si su flujo de inicio de sesión no conserva los parámetros, la persona
  llega al formulario vacío (el enlace sigue sirviendo).
- Fuera: país por la jerarquía de áreas, avisos, ediciones de un festival a lo largo de los años, edición comunitaria.
