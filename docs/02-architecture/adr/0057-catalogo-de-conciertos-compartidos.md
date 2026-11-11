# ADR 0057: Catálogo de conciertos compartidos

**Estado:** Aceptada (2026-11-11, `add-shared-concerts-phase1`). Amplía el ADR 0056 sin reescribirlo.

## Contexto

El ADR 0056 definió el concierto registrado como un recuerdo de la persona y dejó previsto un enlace opcional a un
concierto real. La API de setlist.fm se descartó (clave, cuota, uso no comercial, sin guardar datos). Un spike del
2026-11-11 sobre 13 artistas mostró que MusicBrainz tiene eventos (`/ws/2/event`) de muy buena calidad (97–100 % con
fecha completa y recinto, CC0, misma fuente del catálogo) pero con cobertura muy despareja: cientos para Metallica, Mötley
Crüe o Taylor Swift y casi nada para el catálogo latino (Soda Stereo 3, Charly García 3, Los Bunkers 0).

## Decisión

1. **Hecho y recuerdo son entidades distintas.** `concert` es el concierto compartido; `concert_entry` sigue siendo el
   recuerdo de cada persona y se enlaza con `concert_id` opcional (`ON DELETE SET NULL`), uno por persona y concierto.
   "Estuve ahí" copia los datos del concierto al recuerdo una sola vez; después son de la persona y una actualización del
   concierto no los pisa. Quitar la asistencia borra el recuerdo solo si lo creó la acción y nunca se editó.
2. **Dos orígenes y un estado.** `source IN ('musicbrainz', 'community')` y `status IN ('confirmed', 'pending',
   'hidden')`. Los de MusicBrainz nacen confirmados (ya pasaron por su comunidad y su moderación). Las superficies
   públicas solo muestran confirmados y no cancelados.
3. **Fecha exacta.** Un concierto compartido tiene día (`DATE`); se reconoce por artista, fecha y lugar. Los recuerdos
   siguen admitiendo fechas parciales.
4. **Semilla de MusicBrainz bajo demanda.** Solo `Concert` y `Festival` con fecha completa, por el único cliente y su
   cola, al abrir la pestaña Conciertos del artista (la primera página antes de responder, el resto con `after()`, tope
   1.000, refresco cada 30 días). Upsert por `mbid`; lo que desaparece de MusicBrainz no se borra. No se crean artistas:
   el cartel guarda `mbid` y nombre y se enlaza a los que ya están en el catálogo.
5. **Personas que estuvieron.** La cifra cuenta personas distintas con cualquier audiencia y cuentas activas, con el
   umbral de anonimato de los agregados de comunidad (menos de 5 no da la cifra exacta). La lista respeta la audiencia de
   cada recuerdo y la matriz de visibilidad del perfil.
6. **Fases.** Fase 1: entidad, semilla de MusicBrainz y "Estuve ahí". Fase 2: conciertos creados por la comunidad,
   pendientes hasta confirmarse entre varias personas independientes o con una prueba externa (como un setlist de
   setlist.fm), plausibilidad contra la actividad del artista, detección de duplicados, límites, reportes y fusión, y
   "registrado por" discreto solo en lo confirmado (sin propiedad del concierto). Fase 3: sugerir enlaces de recuerdos
   existentes, desvincular, navegar festivales y proponer a MusicBrainz lo confirmado.

## Consecuencias

- La pestaña Conciertos existe siempre para grupos y personas (no consulta MusicBrainz en la cabecera); para el catálogo
  latino estará casi vacía hasta la Fase 2.
- El país del recinto queda vacío cuando MusicBrainz solo da la ciudad (la jerarquía de áreas cuesta otra request por
  área); se resuelve en la Fase 2 con un caché de áreas.
- Crear un concierto falso no da reconocimiento: lo comunitario no es público hasta confirmarse (Fase 2).
