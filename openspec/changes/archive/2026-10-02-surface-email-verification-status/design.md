## Context

El registro local crea una sesión y dispara en best-effort la solicitud de verificación; el formulario dirige a `/welcome`. Esa ruta ya resuelve la sesión y presenta el onboarding de dos puertas. Inicio también resuelve al usuario autenticado. Hoy `EmailVerificationNotice` vive en el layout de Ajustes y ofrece el reenvío autenticado; Cuenta y seguridad ya muestra un indicador junto al email.

La verificación continúa en modo soft según ADR 0015. La experiencia nueva debe informar sin sugerir que la cuenta está bloqueada. El token, su transporte (incluido el adaptador `console` de desarrollo), la API y la persistencia quedan fuera de alcance.

## Goals / Non-Goals

**Goals:**

- Hacer visible el aviso de email sin verificar en bienvenida, Inicio autenticado y Ajustes.
- Integrar el aviso en la bienvenida sin convertirlo en una puerta adicional ni interrumpir el onboarding existente.
- Reutilizar la acción autenticada de reenvío y el estado persistido como fuente de verdad.
- Ocultar el aviso en el siguiente render de servidor después de verificar.

**Non-Goals:**

- Modificar servicios de autenticación, route handlers, tokens, el transporte de email o su comportamiento best-effort.
- Bloquear el acceso a la aplicación, el onboarding o mutaciones por email sin verificar.
- Añadir notificaciones, polling, estado en tiempo real, persistencia nueva o migraciones.
- Mostrar este estado en perfiles públicos.

## Decisions

### Reutilizar el aviso actual con variantes de presentación

Se extenderá `EmailVerificationNotice` para que pueda presentarse de forma destacada en `/welcome` y compacta en Inicio, manteniendo el uso actual en Ajustes. Las variantes cambiarán jerarquía y copy, no el contrato de reenvío. Esto evita tener componentes y tratamientos de errores divergentes para el mismo estado.

**Alternativa considerada:** crear una tarjeta independiente en cada ruta. Se descarta porque duplicaría la interacción de reenvío, la localización y el tratamiento de errores.

### Resolver la visibilidad desde el estado del usuario en servidor

La página `/welcome` usará el usuario de `resolveSession`; Inicio pasará el estado de verificación del usuario autenticado a `AuthenticatedHome`. El layout compartido de Ajustes ya lo hace. No se hará un fetch del cliente ni se agregará un endpoint.

**Alternativa considerada:** consultar `/api/auth/me` o añadir un endpoint para la UI. Se descarta porque las páginas ya resuelven la sesión en servidor y el endpoint no agregaría información nueva.

### Mantener `/welcome` como onboarding no bloqueante

El aviso aparece después de la introducción de bienvenida y antes de las dos puertas. La persona puede completar o saltar el onboarding y continuar sin verificar. No se cambia la redirección posterior al registro.

**Alternativa considerada:** redirigir a una página exclusiva de confirmación de email. Se descarta porque interrumpiría el onboarding ya implementado y contradiría el modo soft.

### Mantener Ajustes como ubicación del estado explícito

Se conserva el aviso en todas las pantallas de Ajustes y el indicador junto al email en Cuenta y seguridad. El indicador debe identificar el estado del email, sin afirmar una verificación más amplia de la cuenta. No se agrega una copia pública al perfil.

### No exponer detalles del transporte local

El copy de bienvenida describe el estado pendiente y explica que verificar ayuda a recuperar la cuenta; no promete que el enlace ya haya llegado ni revela que en desarrollo el adaptador escribe en consola. El flujo de reenvío conserva la API y los estados de respuesta actuales.

## Risks / Trade-offs

- **El aviso aparece en más de una superficie y puede sentirse repetitivo** → usar una variante compacta en Inicio, mantenerlo no descartable para no perder el recordatorio y ocultarlo en cuanto el estado verificado llegue al siguiente render.
- **Un cambio de verificación en otra pestaña no actualiza una página ya abierta en vivo** → no introducir polling para este alcance; el aviso se actualiza al navegar o refrescar, y el flujo de éxito ya permite volver a Inicio.
- **El adaptador local no entrega el enlace a una bandeja real** → no cambiarlo ni presentarlo como una entrega al usuario; conservar el procedimiento de desarrollo existente para recuperar el link desde el entorno local.

## Migration Plan

No hay migración de datos ni despliegue coordinado con cambios de API. Implementar los componentes y mensajes, actualizar los requisitos y la documentación, ejecutar pruebas de interfaz y los gates del proyecto, y desplegar con el comportamiento soft actual. El rollback consiste en retirar los puntos nuevos de montaje del aviso; no requiere cambios de datos.

## Open Questions

Ninguna bloqueante. La ubicación del aviso en `/welcome` y en Inicio, el indicador del email en Ajustes y el carácter no bloqueante quedan decididos en este diseño.
