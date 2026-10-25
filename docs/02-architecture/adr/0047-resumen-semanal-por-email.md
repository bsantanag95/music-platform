# ADR 0047 — Resumen semanal por email y avisos de premios

## Estado

Aceptado (cambio `add-notification-digest-and-awards`, 2026-10). Extiende el ADR 0045 (notificaciones in-app
materializadas) y el ADR 0046 (avisos de lanzamientos e hitos) sin reescribirlos: el resumen es otro canal sobre la
misma lectura, y los premios son dos tipos nuevos del mismo emisor. Se apoya en el ADR 0014 (transporte de email y
recuperación de contraseña), el ADR 0015 (verificación de email), el ADR 0032 (premios curados en JSON versionado) y el
ADR 0044 (salones de la fama). Web Push queda diferido a la Fase 6 del roadmap.

## Contexto

La bandeja de la Fase 1 y la Fase 2 solo existe dentro de la aplicación. Quien no entra en una semana no se entera de
las respuestas, los seguidores, los hitos ni los lanzamientos; el producto pide un recordatorio **sin presión ni
gamificación**, así que el canal es un correo semanal con lo que ya está sin leer, no una campaña.

Faltan tres piezas:

- **Un transporte real.** `getEmailTransport()` solo tiene el adaptador de consola, que falla cerrado en producción
  (ADR 0014): ningún correo sale hoy. La recuperación de contraseña y la verificación dependen de esa misma pieza.
- **Un envío programado.** No hay cron ni colas (ADR 0011); el único proceso programado es el backup nocturno del Task
  Scheduler. El resumen tiene que poder correrse dos veces la misma semana sin mandar dos correos.
- **Los premios.** `scripts/load-awards.ts` carga ceremonias desde JSON versionado y **reemplaza todas las
  nominaciones de una categoría** cuando cambian. Un aviso que apunte a la nominación desaparecería en la recarga; uno
  que apunte a la ceremonia sobrevive. Cargar la historia de `data/awards/` no puede disparar una avalancha de avisos
  de ceremonias de años anteriores.

Decisiones del usuario (2026-10-25): Resend por HTTP; Web Push diferido a la PWA (Fase 6); el resumen lo envía un
script programado; los premios de artistas seguidos van en "Novedades".

## Decisión

1. **Resend por `fetch`, sin dependencia nueva.** `src/services/email/resend-transport.ts` es el **único** punto de
   salida a Resend, con el mismo criterio que los clientes de MusicBrainz, Wikimedia y ListenBrainz. `POST
   https://api.resend.com/emails` con `Authorization: Bearer RESEND_API_KEY`, `from: EMAIL_FROM` y las cabeceras del
   mensaje. Un error HTTP lanza `EmailDeliveryError` con el estado y **nunca** el cuerpo, que puede repetir el
   destinatario. `EMAIL_TRANSPORT=resend` exige `RESEND_API_KEY` y `EMAIL_FROM` o falla cerrado con
   `EmailConfigError`; el adaptador de consola sigue prohibido en producción. `EmailMessage` suma `headers`, que el
   adaptador de consola imprime y Resend reenvía.
2. **El opt-in vive en `app_user`, no en `notification_preference`.** `notification_digest_enabled` (nace en `false`) y
   `notification_digest_sent_at` (fin de la ventana del último envío). `notification_preference` es por tipo de aviso y
   por canal in-app; el resumen es un canal, no un tipo. Activarlo exige email verificado: `PUT
   /api/me/notification-preferences` con `emailDigest: true` y `email_verified_at` nulo responde `409
   EMAIL_NOT_VERIFIED` y no cambia nada. Si el email cambia y queda sin verificar, el script lo salta sin desactivar la
   preferencia: al verificar el nuevo, vuelve a recibirlo.
3. **El resumen reutiliza la lectura de la bandeja.** `buildDigest` llama a `listNotificationGroups` con los mismos
   filtros de privacidad y la misma agrupación. Solo entradas **no leídas** cuyo evento más reciente cae en la ventana
   `(notification_digest_sent_at o hace 7 días, ahora]`, en dos secciones ("Para ti" y "Novedades") de hasta 8 entradas
   cada una, con "y N más" y un enlace a la bandeja. Los textos son los mismos de la app (`notificationText`, extraído a
   `src/lib/notifications/text.ts`) en el idioma de la cuenta. Asunto neutro con la cifra de entradas; **nada** de
   rachas, días sin entrar ni "te estás perdiendo". Una semana vacía no se envía y no mueve la marca.
4. **Envío programado e idempotente.** `scripts/send-notification-digests.ts` (con `--dry-run`) llama a
   `sendNotificationDigests(now)`: toma un `pg_try_advisory_lock` de `notification-digest` (si otra corrida está en
   curso, sale sin hacer nada), selecciona a quien tiene el resumen activo, email verificado, cuenta activa y marca
   anterior al **lunes 00:00 UTC** de la semana en curso, y envía en serie con una pausa mínima
   (`DIGEST_SEND_INTERVAL_MS`). La marca se escribe **después** de que el transporte acepta el mensaje; un fallo de una
   persona se registra y no corta el lote ni mueve su marca, así que la corrida siguiente lo reintenta. El wrapper
   `.cmd` sigue el patrón del backup y se programa los lunes a las 10:00; al desplegar se pasa al cron del proveedor.
5. **Baja en un clic con token firmado.** `base64url(userId.issuedWeek).hmac` con HMAC-SHA256 y
   `EMAIL_UNSUBSCRIBE_SECRET`, comparado en tiempo constante. **No expira**: darse de baja nunca debe fallar por abrir
   un correo viejo. Solo sirve para poner `notification_digest_enabled = false`; un id desconocido responde igual y no
   distingue si la cuenta existe. Cada resumen lleva el enlace a `/<locale>/notifications/unsubscribe?token=…` y las
   cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` (RFC 8058). El `POST` del cliente de correo da de baja sin
   sesión; el `GET` de la página solo pide confirmar, porque un escáner de enlaces abre el correo y no debe dar de baja
   a nadie. Token inválido → `400 INVALID_UNSUBSCRIBE_TOKEN` (código nuevo, como `INVALID_RESET_TOKEN`).
6. **Premios con referencia estable a la ceremonia.** `notification.award_ceremony_id` (FK `ON DELETE CASCADE`), nunca
   la nominación. Dos tipos, `artist_award_nomination` y `artist_award_win`, ambos sin actor y gobernados por **una**
   preferencia (`artist_award`): la persona no elige por separado "nominaciones" y "premios". El único parcial
   `(recipient_id, award_ceremony_id, kind)` hace idempotente la carga repetida. La fila no guarda a quién: la lectura
   calcula, para esa ceremonia, los artistas seguidos con nominaciones o premios (directamente o como crédito `primary`
   del disco o la canción nominados), sus cifras y el más nombrado. Una recarga que corrige nominaciones se refleja sin
   reescribir avisos; si ya no queda ningún artista seguido, la entrada no se muestra.
7. **La historia no avisa.** `loadAward` devuelve los ids de las ceremonias que escribió y `scripts/load-awards.ts`
   emite después, por premio, con un `INSERT … SELECT` desde nominaciones + créditos + `artist_follow` + cuentas activas
   + preferencia. La ventana es de 30 días hacia atrás para las ceremonias de competencia y el año en curso para las
   clases de Salón de la Fama; un anuncio futuro emite nominaciones, no victorias. Un fallo al emitir se registra y no
   invalida la carga. Halls of fame solo emiten `artist_award_win` ("entró"), porque no tienen nominaciones.
8. **Una entrada por ceremonia en la bandeja.** Los dos tipos comparten `group_key = 'award:<ceremonyId>'`; la
   agregación prefiere la victoria cuando existe. El `target` se calcula al leer (nombre del premio, año, si es Salón
   de la Fama, artista principal, cuántos artistas seguidos y cuántas nominaciones o premios) y la fila enlaza a
   `/awards/<slug>/<year>` o a `/hall-of-fame/<slug>/<year>`.
9. **El resumen y la baja son superficies propias.** Ajustes → Notificaciones suma la sección "Por email" con el
   interruptor del resumen (deshabilitado, con enlace a verificar, sin email verificado) y "Premios de artistas que
   sigues" en "Novedades". La exportación de datos incluye `notifications.emailDigest`. La página de baja es la única
   superficie de notificaciones sin sesión.
10. **Web Push no entra aquí.** Requiere service worker, manifest y una decisión de permisos que el producto todavía no
    tomó; queda en la Fase 6 del roadmap. La tabla y el emisor ya lo admiten como canal.

## Alternativas consideradas

- **SDK de Resend o SMTP con `nodemailer`**: una dependencia nueva para un solo `POST`, o configuración de servidor que
  el proyecto no tiene. El adaptador deja abierta la puerta a otro proveedor implementando `EmailTransport`.
- **Una consulta propia para el email**: duplicaría los filtros de bloqueo, desactivación y moderación, la clase de
  divergencia que el ADR 0045 evitó con una sola fuente de lectura.
- **Disparar el envío con `after()` bajo demanda**: depende de que haya tráfico justo después de la hora y ejecutaría
  envíos largos dentro del ciclo de vida de una request.
- **Una fila de aviso por nominación**: se reescribe en cada recarga de una categoría y multiplica los avisos por
  artista seguido. La ceremonia es la referencia estable.
- **Avisar al cargar la historia**: `data/awards/` incluye años anteriores; sin ventana, la primera carga emitiría
  cientos de avisos de ceremonias viejas.
- **Token de baja que caduca**: un correo viejo dejaría de funcionar justo cuando la persona quiere darse de baja. El
  riesgo de reenviar el email (otra persona da de baja a la titular) es el comportamiento estándar de RFC 8058 y el
  token no puede hacer nada más.
- **Correo por evento o frecuencias configurables**: el producto pide un recordatorio semanal, no notificaciones
  inmediatas por email ni un panel de suscripciones.

## Consecuencias

- Los correos de cuenta (recuperación, verificación, cambio de email, contraseña cambiada) pasan a poder salir en
  producción con la misma configuración; su contenido no cambia.
- El resumen empieza desactivado para todos y los premios ya cargados no avisan: no hay backfill. La migración `0077` es
  aditiva salvo los `CHECK` rehechos.
- Rotar `EMAIL_UNSUBSCRIBE_SECRET` invalida los enlaces de baja de los correos ya enviados; por eso no se rota salvo
  incidente, y el procedimiento está en `docs/06-operations/notification-digest.md`.
- El Task Scheduler depende de que la máquina esté encendida; la idempotencia por semana hace que la corrida siguiente
  envíe lo que faltó, y el paso al cron del proveedor está documentado para el despliegue.
- Un resumen expone solo lo que la persona ya ve en la bandeja; no hay contenido privado de terceros ni actividad
  propia más allá de la cifra de entradas.
- Un fallo de Resend no pierde el resumen: la marca no se mueve y la corrida siguiente lo reintenta.
- Si una corrección de nominaciones deja a la ceremonia sin artistas seguidos, la entrada desaparece de la bandeja sin
  tocar la fila.
