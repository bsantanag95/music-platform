# ADR 0058: Confirmación comunitaria de conciertos

**Estado:** Aceptada (2026-11-11, `add-shared-concerts-phase2`). Desarrolla la Fase 2 del ADR 0057 sin reescribirlo.

## Contexto

MusicBrainz casi no tiene conciertos del catálogo latino (ADR 0057), así que la comunidad tiene que poder crearlos. Pero
nadie puede verificar que un concierto existió, y un crédito público ("Registrado por") invita a inventar conciertos para
obtenerlo. Hace falta que lo falso no llegue a lo público sin depender de moderar cada alta.

## Decisión

1. **Nace por confirmar.** Un concierto de la comunidad (`source = 'community'`) nace `pending`. Pasa a `confirmed`, con
   `confirmed_at`, cuando lo enlazan **3 personas distintas que cuentan** (cuenta activa, email verificado, al menos 7
   días de antigüedad y sin suspensión social; quien lo creó cuenta como una) o cuando trae un enlace a un setlist de
   setlist.fm cuyo segmento de artista (`/setlist/<artista>/<año>/…`) coincide con el nombre normalizado de alguien del
   cartel y cuyo año coincide con el de la fecha. Se reevalúa al crearlo, al decir "Estuve ahí" y al fusionar otro en él.
2. **La confirmación es pegajosa.** Quitar asistencias después no la deshace; solo la moderación oculta. Restaurar uno
   oculto vuelve a confirmado si alguna vez se confirmó.
3. **Lo por confirmar no es público ni cuenta.** Solo se ve con sesión (sección "Por confirmar" de la pestaña y su página,
   con `noindex` y 404 para un anónimo), con las confirmaciones que faltan; no entra en ninguna cifra de personas, no
   muestra quiénes estuvieron ni quién lo registró, y en los perfiles un recuerdo enlazado a él no muestra el enlace.
4. **Barreras al crear.** Los mismos requisitos de cuenta que para contar (`403 CONCERT_CREATE_NOT_ALLOWED` o
   `SOCIAL_SUSPENSION_ACTIVE`), hasta 5 por persona en 24 horas (`429 CONCERT_CREATE_LIMIT`), fecha exacta no futura, y
   plausibilidad: el año no puede ser anterior a la formación o nacimiento de un artista principal ni posterior a su
   separación o muerte (`400 CONCERT_IMPLAUSIBLE`). Recinto, ciudad y país obligatorios (también como `CHECK`).
5. **Duplicados.** Antes de crear se muestran los conciertos del artista a ±1 día, primero los de la misma ciudad. El
   mismo artista principal, la misma fecha y la misma ciudad normalizada (`city_key`, columna generada con `search_key`)
   se rechazan (`409 CONCERT_DUPLICATE` con el id existente), serializados con un `advisory lock` por artista y fecha. Si
   MusicBrainz agrega después el mismo concierto, el de la comunidad se fusiona solo en el importado.
6. **Fusión.** Los recuerdos pasan al destino conservando `updated_at`; si la persona ya estaba en el destino, su recuerdo
   del origen queda sin enlace (nunca se borra, ADR 0056). El origen queda oculto con `merged_into_id` y su página redirige.
7. **Crédito discreto.** "Registrado por @usuario" solo en uno de la comunidad confirmado, con la cuenta activa y sin
   bloqueo con quien mira. Sin contadores, rankings ni insignias. Un concierto de MusicBrainz no muestra creador.
8. **Reportes y moderación.** Cualquiera con sesión reporta un concierto visible con motivo cerrado (`did_not_happen`,
   `duplicate`, `wrong_data`); la moderación oculta, restaura o fusiona, auditado en `moderation_action.concert_id`, y la
   acción resuelve los reportes abiertos. La moderación de conciertos no emite avisos (las notificaciones quedan fuera).

## Alternativas descartadas

- 2 personas (basta una segunda cuenta) o 5 (el catálogo chico nunca confirmaría). Queda en una constante.
- Confirmar solo por moderación: no escala.
- Aceptar cualquier enlace de setlist.fm como prueba: se pega el de otro concierto.
- Normalizar la ciudad en la aplicación con un script de relleno: `search_key` (0051) ya existe y es inmutable, así que la
  base la mantiene también para los conciertos ya importados.

## Consecuencias

- Tres cuentas coordinadas de 7 días con email verificado pueden confirmar algo falso; lo frenan los reportes y la
  ganancia es mínima (un crédito discreto).
- "Stgo" y "Santiago" no se detectan como duplicado exacto; aparecen como candidatos por artista y fecha y la fusión
  manual resuelve el resto.
- Fuera de esta fase: sugerir crear conciertos desde recuerdos coincidentes, desvincular desde Mis conciertos, festivales
  por días y escenarios, proponer lo confirmado a MusicBrainz y los avisos ("tu concierto fue confirmado").
