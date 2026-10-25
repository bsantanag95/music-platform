# notification-digest Specification

## Purpose
Resumen semanal de notificaciones por email: transporte de producción (Resend), opt-in con email verificado, contenido tomado de la bandeja (semana vacía no envía), envío programado idempotente por semana y baja en un clic con token firmado.
## Requirements
### Requirement: Transporte de email de producción

El sistema SHALL poder enviar email por Resend cuando `EMAIL_TRANSPORT=resend`, exigiendo `RESEND_API_KEY` y
`EMAIL_FROM` o fallando cerrado con `EMAIL_CONFIG_MISSING`. Toda request a Resend SHALL salir de un único módulo. El
adaptador de consola SHALL seguir prohibido en producción. Un error de entrega SHALL NOT registrar el cuerpo del
email ni la respuesta del proveedor.

#### Scenario: Sin clave

- **WHEN** `EMAIL_TRANSPORT=resend` y falta `RESEND_API_KEY`
- **THEN** pedir el transporte lanza el error de configuración y no se intenta ningún envío

#### Scenario: Emails de cuenta en producción

- **WHEN** en producción con Resend configurado una persona pide recuperar su contraseña
- **THEN** el email sale por Resend con el mismo contenido de antes

### Requirement: Resumen semanal opt-in

La persona SHALL poder activar un resumen semanal por email, desactivado por defecto. Activarlo SHALL exigir el
email verificado (`409 EMAIL_NOT_VERIFIED`). El resumen SHALL enviarse solo a cuentas activas con el email
verificado.

#### Scenario: Sin activar

- **WHEN** Ana nunca activó el resumen
- **THEN** no recibe ningún email de notificaciones

#### Scenario: Email sin verificar

- **WHEN** Ana intenta activar el resumen con el email sin verificar
- **THEN** la API responde `409` con código `EMAIL_NOT_VERIFIED` y la pantalla le ofrece verificarlo

#### Scenario: Cambio de email sin verificar

- **WHEN** Ana tenía el resumen activo y cambia su email sin verificarlo todavía
- **THEN** no recibe el resumen hasta verificar el nuevo, y la preferencia sigue activa

### Requirement: Contenido del resumen

El resumen SHALL reunir las entradas no leídas cuyo evento más reciente ocurrió desde el resumen anterior (o en los
últimos 7 días), en dos secciones "Para ti" y "Novedades", con los mismos filtros de privacidad, agrupación y textos
que la bandeja, hasta 8 entradas por sección con la cifra del resto y un enlace a la bandeja. SHALL usar el idioma
preferido de la persona (español si no tiene). Una semana sin entradas SHALL NOT enviar email. El resumen SHALL NOT
incluir métricas de actividad propia, rachas ni recordatorios de inactividad.

#### Scenario: Semana con novedades

- **WHEN** Ana tiene 3 respuestas sin leer y un lanzamiento de la semana
- **THEN** recibe un email con las dos secciones y un enlace a `/me/notifications`

#### Scenario: Semana vacía

- **WHEN** Ana no tiene nada sin leer desde el resumen anterior
- **THEN** no recibe email esa semana

#### Scenario: Ya lo leyó en la app

- **WHEN** Ana abrió y leyó todas sus entradas antes del envío
- **THEN** no recibe email

#### Scenario: Contenido filtrado

- **WHEN** el autor de una respuesta a Ana desactivó su cuenta durante la semana
- **THEN** esa respuesta no aparece en el resumen

### Requirement: Envío semanal idempotente

El envío SHALL correr como un proceso programado que no se superpone consigo mismo y que, corrido dos veces en la
misma semana, no envía dos resúmenes a la misma persona. Un fallo al enviar a una persona SHALL NOT cortar el resto
del lote y SHALL dejarla pendiente para la corrida siguiente.

#### Scenario: Doble corrida

- **WHEN** el proceso corre el lunes y otra vez el martes
- **THEN** cada persona recibe a lo sumo un resumen esa semana

#### Scenario: Fallo de una entrega

- **WHEN** Resend rechaza el envío a una persona
- **THEN** el resto del lote se envía y esa persona lo recibe en la corrida siguiente

### Requirement: Baja en un clic

Cada resumen SHALL incluir un enlace para darse de baja y las cabeceras `List-Unsubscribe` y
`List-Unsubscribe-Post`. Darse de baja SHALL NOT exigir sesión: un `POST` con el token firmado desactiva el resumen, y
la página del enlace pide confirmar antes de hacerlo. El token SHALL servir solo para desactivar el resumen de esa
persona. Un token inválido SHALL responder `400` con código `INVALID_UNSUBSCRIBE_TOKEN`.

#### Scenario: Baja desde el cliente de correo

- **WHEN** el cliente de correo de Ana hace el `POST` de un clic de la cabecera
- **THEN** el resumen queda desactivado sin que Ana inicie sesión

#### Scenario: Enlace abierto por un escáner

- **WHEN** un escáner de enlaces abre la página de baja con `GET`
- **THEN** el resumen sigue activo hasta que alguien confirma

#### Scenario: Token alterado

- **WHEN** alguien envía un token modificado
- **THEN** la API responde `400` con código `INVALID_UNSUBSCRIBE_TOKEN` y no cambia nada

