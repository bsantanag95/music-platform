## Context

La biblioteca personal ya tiene un patrón para registros propios con audiencia: la colección física (`collection_entry`,
migración `0012`) con audiencia por entrada, lectura ajena con la matriz de visibilidad, riel en el perfil, exportación y
audiencia por defecto (`default-audience`). La ficha del artista enlaza a sus conciertos en setlist.fm
(`add-setlistfm-artist-link`), pero no hay forma de decir "yo estuve ahí". No existe una entidad de concierto en el
catálogo, y la API de setlist.fm se descartó (clave, cuota, uso no comercial y prohibición de guardar datos).

## Goals / Non-Goals

**Goals:** registrar conciertos asistidos con datos básicos, verlos y gestionarlos en Mis conciertos, mostrarlos en el
perfil según su audiencia, y un modelo que pueda enlazarse más adelante a conciertos reales sin migrar datos.

**Non-Goals:** entidad de concierto compartida, verificación o sugerencias, API de setlist.fm, festivales con varios
artistas, feed, Láminas, compartir y conteos de comunidad.

## Decisions

### D1. El registro es un recuerdo de la persona, no un concierto

`concert_entry` guarda lo que la persona escribió y nada más afirma. Si mañana existe una entidad `concert` (propia o de
una fuente externa), se agrega una columna `concert_id UUID NULL` que la referencia: enlazar es opcional y lo confirma la
persona; los registros sin enlace siguen siendo válidos y los campos escritos nunca se sobrescriben. Así no hay
"migración" de datos, solo enlaces nuevos. Va en un ADR para que el sistema futuro parta de esa regla.
*Alternativa descartada:* crear ya una tabla `concert` compartida a la que se enlazan los registros: obligaría a
deduplicar conciertos escritos a mano por personas distintas (fechas parciales, nombres de recinto distintos) sin
fuente de verdad, que es justo lo que se quiere evitar ahora.

### D2. Campos elegidos para que el enlace futuro sea posible

- `artist_id` obligatorio (FK, `ON DELETE CASCADE`): la base de cualquier coincidencia.
- `event_date TEXT` con `CHECK` `^\d{4}(-\d{2}(-\d{2})?)?$`, el mismo formato de fecha parcial que `artist.life_begin`;
  el servidor además valida que sea una fecha real y no futura (el `CHECK` no puede usar `now()` de forma estable, así
  que la regla de "no futura" queda en la capa de servicio y en el esquema Zod; el formato sí en SQL).
- `country CHAR(2)` con `CHECK` `^[A-Z]{2}$`, como el país del perfil; se reusa `CountryPicker`.
- `city`, `venue`, `tour`: `TEXT` ≤100 (`CHECK`), recortados; vacíos se guardan como `NULL`.
- `setlistfm_url`: `CHECK` de prefijo `https://(www\.)?setlist\.fm/setlist/`; la URL de un setlist identifica un
  concierto exacto, así que es el ancla más fuerte para un enlace futuro. No se usa la API: es un dato de la persona.
- `note` ≤140, como la colección; `audience` con el mismo `CHECK` y `DEFAULT 'followers'`.
- Índices: `(user_id, event_date DESC)` para la página propia y el perfil, `(user_id, artist_id)` para el panel.
- Sin unicidad: dos conciertos de la misma gira el mismo día (dos funciones) son válidos.

### D3. Orden por fecha parcial

Ordenar `event_date` como texto descendente deja `2019-11-02` antes que `2019-11` y `2019`, que es lo pedido (lo más
preciso primero dentro del mismo período) y lo resuelve el índice. El desempate es `created_at DESC`. El año del grupo es
`left(event_date, 4)`.

### D4. Un registro por artista

Festivales y teloneros se registran como varios registros (uno por artista). Agruparlos por fecha y lugar es trabajo
futuro y no requiere cambiar este modelo.

### D5. Mismo patrón que la colección física

Servicio `src/services/concerts/` con las funciones de alta, edición, baja, lectura propia, lectura ajena (reusa el
filtro de visibilidad de la colección) y conteo para el panel. Rutas envueltas con `withErrorHandling`, validación Zod en
la entrada y en el cliente vía `src/lib/api/client.ts`. Formulario como diálogo cliente reutilizable (desde el panel con
el artista fijo; desde Mis conciertos con buscador de artistas reutilizando `useTargetSearch`). La página propia y la ajena
son Server Components; la gestión (editar, quitar, audiencia) usa TanStack Query solo para las mutaciones y refresca la
ruta.

### D6. Audiencia por defecto y "Aplicar a lo existente"

Los conciertos entran como sexto tipo en `resolveAudience` al crear y en `apply-audience.ts` (vista previa y acción, con
su conteo), para que la preferencia de la persona tenga el mismo efecto que en la colección. No tocar `updated_at` al
aplicar, igual que con las copias de colección.

### D7. Panel del artista

Fila **En vivo** después de Colección, en el mismo `ArtistRelationPanel`; la cifra sale de un `count(*)` por
`(user_id, artist_id)` incluido en `loadPersonalState`, sin una request aparte.

## Risks / Trade-offs

- [Datos escritos a mano, sin verificar] → aceptado: es un registro personal; el enlace a setlist.fm es la forma de
  precisarlo, y D1 deja abierta la verificación futura.
- [Panel con una fila más] → la fila es corta (una cifra y una acción); se revisa en móvil.
- [Un artista que se borra del catálogo borra los registros] → coherente con la colección; los artistas del catálogo no
  se borran en la operación normal.
- [La regla "fecha no futura" no está en SQL] → validada en servicio y en Zod; el formato sí está en SQL (regla
  `enforce-rules-in-code`: el formato y los largos, que no dependen del tiempo, viven en la base).

## Migration Plan

Migración `0091` aditiva (tabla nueva). Aplicar con `pnpm run db:migrate`. Rollback: revertir el código; la tabla puede
quedarse vacía o borrarse con una migración nueva.

## Open Questions

Ninguna bloqueante.
