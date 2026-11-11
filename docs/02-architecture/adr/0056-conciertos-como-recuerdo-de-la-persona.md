# ADR 0056: Conciertos asistidos como recuerdo de la persona

**Estado:** Aceptada (2026-11-11, `add-my-concerts`).

## Contexto

Las personas quieren registrar los conciertos a los que fueron para enriquecer su perfil. No existe en el catálogo una
entidad de concierto, y la única fuente amplia (setlist.fm) se descartó como integración: su API exige clave, tiene cuota
diaria, solo permite uso no comercial y prohíbe guardar sus datos más allá de una caché corta (ver
`docs/03-data/data-licensing.md`, sección F). Registrar conciertos escritos a mano plantea la duda de qué pasará cuando
exista un sistema de conciertos más robusto: ¿habrá que migrar o verificar estos registros?

## Decisión

Un concierto registrado (`concert_entry`, migración `0091`) es **un recuerdo de la persona, no un concierto verificado**:

- Guarda lo que la persona escribió y nada más afirma: el artista del catálogo (obligatorio), la fecha con la precisión
  que recuerde (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`), país (ISO), ciudad, recinto, gira, nota y, opcionalmente, el enlace al
  setlist en setlist.fm que pega la persona. No se consulta setlist.fm ni se lee nada de él.
- No hay una entidad compartida ni unicidad: dos personas que fueron al mismo concierto tienen dos registros
  independientes, y la misma persona puede registrar dos funciones del mismo día.
- Si en el futuro existe una entidad de concierto (propia o de una fuente externa), se **agrega** una columna opcional
  `concert_id` que la referencia. Enlazar es opcional y lo confirma la persona (el sistema puede sugerir coincidencias por
  artista, fecha y lugar, y el enlace a setlist.fm identifica un concierto exacto). Los campos escritos **nunca se
  sobrescriben** y los registros sin enlace siguen siendo válidos. No hay migración de datos: solo enlaces nuevos.
- Un registro por artista: un festival se registra como varios registros. Agruparlos es trabajo futuro y no cambia este
  modelo.
- Mismo tratamiento que la colección física: audiencia por registro (con la audiencia por defecto del usuario al crear),
  lectura ajena con la matriz de visibilidad del perfil, exportación y borrado en cascada con la cuenta.

## Consecuencias

- Hacerlo simple hoy no complica el futuro: la regla de "enlace opcional sin reescribir" queda fijada antes de que exista
  el sistema robusto.
- Los datos no son verificables; la interfaz lo dice ("es tu registro") y no muestra cifras de comunidad sobre ellos.
- Las reglas de formato y largo viven como `CHECK` en la base; "la fecha no puede ser futura" solo en el servicio y en el
  esquema de la petición, porque depende del día de la consulta.
- Un sistema futuro de conciertos debe partir de esta regla: ofrecer el enlace, no reemplazar el registro.
