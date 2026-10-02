## Why

Una persona registrada localmente puede llegar a `/welcome` y recorrer Inicio sin encontrar el aviso de verificación que hoy solo aparece en Ajustes. Hay que hacer visible el estado y la acción de reenvío en los puntos donde la persona los necesita, sin convertir la verificación en una barrera para usar la cuenta.

## Goals

- Informar del email pendiente en la bienvenida inicial y en Inicio hasta que se verifique.
- Mantener Cuenta y seguridad como lugar donde consultar el estado explícito del email.
- Conservar la verificación en modo soft y el onboarding de dos puertas actual.

## Non-Goals

- Cambiar la generación, persistencia, expiración, consumo o reenvío de tokens, ni el adaptador de email `console`.
- Bloquear el acceso, el onboarding o acciones de la cuenta por falta de verificación.
- Agregar notificaciones, cambios de esquema o una verificación en tiempo real.
- Mostrar el estado de verificación en perfiles públicos.

## What Changes

- Se amplía el aviso existente para aparecer en `/welcome` y en Inicio autenticado cuando `email_verified_at` sea nulo.
- El aviso de bienvenida explica que la cuenta se puede usar antes de verificar y ofrece el reenvío existente y un acceso a Cuenta y seguridad.
- Se mantiene el aviso en todas las pantallas de Ajustes y el estado del email en Cuenta y seguridad.
- Se actualizan requisitos y documentación de onboarding, Inicio y verificación para describir las superficies visibles y su desaparición tras verificar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `email-verification`: ampliar las superficies donde se avisa a una persona autenticada sin verificar, manteniendo el comportamiento soft.
- `onboarding`: mostrar el aviso de verificación en `/welcome` sin añadir una puerta ni alterar las dos actividades de onboarding.
- `home`: mostrar el aviso de verificación en Inicio autenticado mientras el estado esté pendiente.

## Impact

- Interfaz: `EmailVerificationNotice`, la página `/welcome`, Inicio autenticado y sus mensajes localizados en español e inglés.
- Ajustes de cuenta: conservar el aviso y el indicador de estado existente; no se añade un endpoint ni cambia el contrato REST.
- Pruebas: componentes de aviso, bienvenida, Inicio autenticado y los casos existentes de Ajustes.
- Documentación de producto/arquitectura: onboarding, Inicio, ajustes de cuenta y descripción de superficies de verificación.
