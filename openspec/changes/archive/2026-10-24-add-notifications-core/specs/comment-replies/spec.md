## REMOVED Requirements

### Requirement: Sin notificaciones en esta etapa

**Reason**: `add-notifications-core` agrega la bandeja de notificaciones; responder a un tema notifica al autor de la
raíz (`comment_reply`) y a quienes ya participaron en el hilo (`thread_reply`).

**Migration**: el comportamiento queda definido en la capability `notifications` ("Notificación por respuesta a un
tema propio" y "Notificación por respuesta en un hilo donde se participó"). No hay datos que migrar: las respuestas
anteriores al cambio no generan notificaciones retroactivas.
