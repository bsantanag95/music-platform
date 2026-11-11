## Context

- Fase 1 (ADR 0057, migración `0092`): `concert` con `source` (`musicbrainz` | `community`) y `status` (`confirmed` |
  `pending` | `hidden`), `concert_performer` y el enlace `concert_entry.concert_id`. Las lecturas públicas ya filtran
  `status = 'confirmed' AND NOT cancelled`; "Estuve ahí" rechaza lo no confirmado.
- La moderación existente: `content_report` (comentario, reseña o usuario, motivo, estado, único por persona y objetivo
  abiertos) y `moderation_action` (auditoría, objetivos opcionales desde `0046`, acciones `hide`, `restore`,
  `report_resolve`, `report_dismiss`, `suspend_social`, `revoke_social`). La suspensión social se comprueba con
  `requireSocialActivityAllowed`.
- La ficha del artista guarda `life_begin`, `life_end` y `life_ended` (fechas parciales, `0054`).
- Los conciertos de MusicBrainz suelen tener ciudad sin país (Fase 1, D4).

## Goals / Non-Goals

**Goals:** creación comunitaria con confirmación, plausibilidad, duplicados, requisitos, límites, reportes, moderación y
crédito discreto.

**Non-Goals:** ver la propuesta (Fase 3, jerarquía de áreas, edición comunitaria de confirmados, notificaciones).

## Decisions

### D1. Confirmación: 3 personas o una prueba externa

Un concierto comunitario nace `pending`. Pasa a `confirmed` (con `confirmed_at`) cuando:
- lo enlazan 3 personas **distintas que cuentan**: cuenta activa, email verificado, al menos 7 días de antigüedad y sin
  suspensión social, contando a quien lo creó; o
- trae un enlace a un setlist de setlist.fm cuyo segmento de artista coincide con el nombre normalizado de un artista
  del cartel y cuyo año coincide con el de la fecha (`/setlist/<artista>/<año>/…`).

La confirmación es **pegajosa**: si después alguien quita su asistencia, no vuelve a `pending`; solo la moderación puede
ocultarlo. Se reevalúa al crear el concierto, al decir "Estuve ahí" y al cambiar el enlace de setlist.fm.
*Alternativas descartadas:* 2 personas (demasiado fácil con una segunda cuenta), 5 (el catálogo chico nunca confirmaría);
confirmar solo por moderación (no escala); aceptar cualquier enlace de setlist.fm (se pega el de otro concierto).
*Riesgo asumido:* tres cuentas coordinadas pueden confirmar algo falso. Por eso existe el reporte, y la ganancia es poca
(un crédito discreto, D7).

### D2. Lo por confirmar es visible solo con sesión y no cuenta

- En la pestaña Conciertos, una sección **Por confirmar** después de los confirmados, solo con sesión, con cuántas
  confirmaciones faltan y "Estuve ahí" (que suma).
- Su página existe solo con sesión (404 para un anónimo), con un aviso y `noindex`.
- No entra en cifras de personas, en el perfil, ni en la búsqueda de duplicados como prueba de nada.
- Con sesión se ven los pendientes de cualquiera: es la única forma de que otros los confirmen.
- "Registrado por" no se muestra mientras está por confirmar.

### D3. Duplicados

- `city_key`: ciudad normalizada (minúsculas, sin tildes, puntuación a espacio) como **columna generada** con
  `search_key(city)` (migración 0051, la misma función de la búsqueda). La mantiene la base para todos los conciertos,
  también los de MusicBrainz ya importados; la aplicación nunca la escribe.
- **Candidatos** antes de crear (`GET /api/concerts/candidates?artistId&date&city`): conciertos confirmados o por
  confirmar con ese artista en el cartel y fecha a ±1 día (zonas horarias), primero los de la misma ciudad. Se muestran
  como "¿Es alguno de estos?" con "Estuve ahí".
- **Duplicado exacto** en el servidor: mismo artista principal, misma fecha y mismo `city_key` → `409 CONCERT_DUPLICATE`
  con el id existente. Se comprueba dentro de la transacción con un `advisory lock` por `(artista, fecha)` para que dos
  pedidos simultáneos no creen dos.
- **MusicBrainz llega después**: al importar un concierto de MusicBrainz, si existe uno comunitario no oculto con el
  mismo artista principal, la misma fecha y el mismo `city_key`, se fusiona en el de MusicBrainz (D6).

### D4. Plausibilidad

- Fecha exacta, desde 1900, no futura (`isValidConcertDate`).
- Por cada artista **principal** del catálogo con datos de actividad: el año del concierto no puede ser anterior al año de
  `life_begin`; si `life_ended`, no puede ser posterior al año de `life_end`. Sin datos de actividad no se restringe.
  Error `400 CONCERT_IMPLAUSIBLE`. (Un tributo a un artista fallecido se registra con los artistas que tocaron.)
- Recinto, ciudad y país obligatorios para la comunidad (el país con el selector del perfil).

### D5. Requisitos y límites para crear

Email verificado, cuenta de al menos 7 días, activa y sin suspensión social (`403 CONCERT_CREATE_NOT_ALLOWED` o
`SOCIAL_SUSPENSION_ACTIVE`), y hasta 5 conciertos creados en 24 horas (`429 CONCERT_CREATE_LIMIT`). Los mismos
requisitos definen quién "cuenta" para confirmar (D1), salvo el límite.

### D6. Moderación

- Reportar: `POST /api/concerts/{id}/report` con motivo `did_not_happen` | `duplicate` | `wrong_data` y un texto
  opcional; un reporte abierto por persona y concierto (`content_report.concert_id`, único parcial). Se puede reportar
  cualquier concierto visible para quien reporta (también los de MusicBrainz: pueden traer errores).
- La cola de moderación lista los reportes de conciertos con enlace a la página.
- Acciones (permiso de moderación, auditadas en `moderation_action.concert_id`):
  - **Ocultar** (`status = hidden`) y **restaurar** (vuelve a `confirmed` si tenía `confirmed_at`, si no a `pending`).
  - **Fusionar** en otro concierto: los recuerdos enlazados pasan al destino; si la persona ya estaba en el destino, su
    recuerdo del origen queda **sin enlace** (no se borra: ADR 0056). El origen queda `hidden` con `merged_into_id`. El
    destino se reevalúa (D1). La fusión automática de MusicBrainz (D3) usa la misma función, con la auditoría a nombre de
    nadie (`actor_id` nulo no es posible: se registra en `concert.merged_into_id` y en un log del servidor, sin fila de
    `moderation_action`).
- Una página de un concierto fusionado redirige al destino.

### D7. Crédito discreto

`created_by` (`ON DELETE SET NULL`). En un concierto comunitario **confirmado**, la página muestra "Registrado por
@usuario" en tipografía de dato, si la cuenta está activa y quien mira puede ver su perfil (bloqueo excluido). No hay
contador, ranking ni insignia. Un concierto de MusicBrainz no muestra creador.

### D8. Crear desde la pestaña o desde un recuerdo

- Pestaña Conciertos, con sesión: "Agregar un concierto", con el artista de la pestaña como principal.
- Mis conciertos: un recuerdo **sin enlazar** con fecha completa, ciudad y país ofrece "Compartir este concierto": abre
  la misma creación con sus datos y, al crear, ese recuerdo queda enlazado (no se crea otro).
- El formulario primero muestra los candidatos (D3); crear es el último paso.
- Al crear, la persona queda como asistente con la regla de "Estuve ahí" (crea o enlaza su recuerdo).

### D9. Nombre del concierto

Opcional; si falta, se compone como "<artista principal> en <recinto>". Hasta 300 caracteres, como los de MusicBrainz.

## Risks / Trade-offs

- [Cuentas coordinadas] → 3 cuentas de 7 días con email verificado, reportes y moderación; ganancia mínima (D7).
- [Pendientes visibles con sesión] → marcados como "Por confirmar", fuera de cifras e índices; necesarios para confirmar.
- [Ciudad escrita distinto ("Stgo", "Santiago de Chile")] → los candidatos por ±1 día y artista no dependen de la ciudad;
  el duplicado exacto sí, y la fusión manual resuelve el resto.
- [Carga de moderación] → los reportes van a la cola existente; la fusión automática con MusicBrainz reduce duplicados.

## Migration Plan

Migración `0093` aditiva (columnas y `CHECK` nuevos que las filas existentes cumplen). `city_key` es una columna
generada con `search_key` (la extensión `unaccent` ya está instalada desde `0050`), así que se calcula al aplicar la
migración también para los conciertos ya importados: no hace falta script de relleno. Rollback: revertir el código.

## Open Questions

- Ninguna bloqueante. Umbral de 3 y antigüedad de 7 días quedan en constantes para ajustarlos con datos reales.
