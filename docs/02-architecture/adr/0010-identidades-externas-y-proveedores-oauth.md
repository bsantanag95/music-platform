# ADR 0010 — Identidades externas para proveedores OAuth/OIDC

**Estado:** Aceptado

## Contexto

La autenticación local de la Fase 4 debe poder extenderse en el corto plazo con inicio de
sesión mediante Google y, posteriormente, otros proveedores sociales. `app_user` representa a la
persona dentro del producto, pero la identidad que entrega un proveedor externo no debe
guardarse directamente en esa tabla ni confundirse con el email del usuario.

El mecanismo de sesión de la aplicación ya está definido en ADR 0008 — Sesiones server-side
con Argon2id, en vez de JWT. Los proveedores externos deben integrarse con ese mismo modelo de
sesión, sin introducir un segundo mecanismo de sesiones.

Para proveedores OIDC, la identidad estable de un usuario está determinada por la combinación del
issuer (iss) y el subject (sub) del proveedor. El email es un atributo de la identidad, no su
identificador estable, y no debe utilizarse por sí solo para vincular cuentas.

## Decisión

- Las identidades externas se almacenan en una tabla `auth_identity` separada de `app_user`.
- Cada identidad pertenece a un único usuario y se identifica de forma única por
  `(provider, provider_account_id)`.
- Para proveedores OIDC, provider identifica inequívocamente al issuer (iss) y
  provider_account_id corresponde al claim sub.
- La restricción de unicidad (provider, provider_account_id) será impuesta por la base de datos,
  no únicamente por lógica de aplicación.
- `auth_identity.user_id` tendrá una referencia a `app_user.id` y se indexará para resolver las
  identidades de un usuario. El comportamiento de borrado seguirá las reglas de retención de
  usuarios; por defecto, una identidad sin utilidad fuera del usuario se eliminará junto con él.
- Google se implementará mediante OAuth/OIDC en el backend de la misma aplicación Next.js.
- Cada proveedor tendrá un adaptador propio detrás de una interfaz común.
- El flujo utilizará Authorization Code Flow y será gestionado por el backend.
- El flujo OAuth utilizará state para protección contra CSRF y PKCE para proteger el intercambio
  del authorization code.
- Tras validar la respuesta del proveedor, el sistema resuelve la identidad externa mediante su
  (`provider`, `provider_account_id`) y obtiene el `app_user` asociado.
- Si la identidad externa no existe y el flujo corresponde a un nuevo registro, el sistema podrá
  crear un nuevo `app_user` y su `auth_identity` asociada.
- El login mediante un proveedor externo no vinculará automáticamente una identidad con un
  `app_user` existente únicamente porque compartan email.
- La vinculación de una identidad externa con un `app_user` existente será una operación explícita
  iniciada desde una sesión autenticada, o requerirá una verificación equivalente de propiedad.
- Una vez resuelta la identidad, el sistema termina siempre creando la sesión server-side definida
  en ADR 0008.
- En el callback OIDC se validarán, como mínimo, issuer, audience, firma, expiración y
  nonce del ID token, además de validar correctamente el authorization code, redirect_uri,
  state y el flujo PKCE.
- No se almacenarán access tokens ni refresh tokens OAuth si el único objetivo del proveedor es
  autenticar al usuario y no consumir APIs del proveedor posteriormente.
- Si en el futuro se necesita consumir APIs del proveedor, el almacenamiento y ciclo de vida de
  esos tokens constituirá una decisión adicional de seguridad y no se asumirá como parte de este
  ADR.

## Ubicación

La implementación vive en el backend de este monolito:

- `src/services/auth/` contiene sesiones, usuarios, identidades y autorización.
- `src/services/auth/providers/` contiene los adaptadores de Google y futuros proveedores.
- `src/app/api/auth/` contiene los route handlers de inicio, callback y cierre del flujo.
- `middleware.ts` puede proteger o redirigir, pero no implementa el flujo OAuth completo.
- El frontend solo inicia los flujos y muestra sus estados; nunca recibe secretos ni valida tokens
  OAuth/OIDC.

## Justificación

Este diseño permite añadir Google sin cambiar el modelo de sesión, ratings o comentarios. También
evita agregar columnas específicas como `google_id`, `apple_id` o `facebook_id` a `app_user`, y
mantiene abierta la extensión a otros proveedores sin duplicar la lógica de autenticación.

Separar `auth_identity` de `app_user` permite distinguir entre la identidad interna del producto
y las distintas formas mediante las que una persona puede autenticarse. Una misma persona podrá
tener varias identidades externas vinculadas a un único `app_user` sin duplicar su cuenta dentro
del producto.

El identificador estable del proveedor, representado para OIDC por (issuer, sub), es la clave
de vinculación. El email se considera un atributo de la identidad y no una prueba suficiente de
que dos identidades pertenezcan a la misma persona. Esto evita vincular accidentalmente una cuenta
externa con una cuenta local preexistente.

El flujo OAuth/OIDC termina en la misma sesión server-side definida en ADR 0008. OAuth/OIDC
demuestra la identidad del usuario, pero no introduce un segundo mecanismo de sesión dentro de la
aplicación.

El uso de `state`, PKCE y `nonce`, junto con la validación de issuer, audience, firma y expiración,
permite mantener las garantías de seguridad del flujo Authorization Code/OIDC sin trasladar la
gestión de credenciales al frontend.

No almacenar tokens OAuth reduce la superficie de riesgo cuando el producto no necesita actuar
contra las APIs del proveedor en nombre del usuario. Si en el futuro aparece ese requisito,
el almacenamiento y ciclo de vida de esos tokens deberán evaluarse como una decisión independiente.

## Consecuencias

- La migración de autenticación debe incluir `auth_identity`, aunque el primer proveedor externo
  pueda habilitarse después del login local.
- `auth_identity` tendrá, como mínimo, una referencia a `app_user`, `provider`,
  `provider_account_id` y `timestamps`, con UNIQUE(`provider`, `provider_account_id`) e índice sobre
  `user_id`.
- La eliminación de un `app_user` deberá definir explícitamente el comportamiento de sus
  `auth_identity`; por defecto, la relación podrá utilizar ON DELETE CASCADE si no existen
  requisitos de retención que indiquen lo contrario.
- El login externo y el linking de una cuenta existente son operaciones distintas y no deben
  compartir una ruta que permita vinculación implícita por email.
- El flujo de vinculación de una cuenta local existente requiere una acción autenticada y un nuevo
  flujo OAuth/OIDC completo; conocer o coincidir un email no es suficiente.
- Los adaptadores de proveedores son responsables de traducir la respuesta específica de cada
  proveedor a una identidad común, mientras que la creación/resolución de app_user y la sesión
  permanecen en la lógica de autenticación compartida.
- Si se incorporan varios proveedores o aumentan los requisitos de OAuth/OIDC (linking complejo,
  recuperación, MFA, gestión avanzada de sesiones u otros), se reevaluará la implementación propia
  frente a una librería especializada.
- Una eventual adopción de una librería especializada no implica necesariamente cambiar el modelo
  de sesión. Cualquier cambio del mecanismo de sesión seguirá requiriendo revisar ADR 0008.
- Ningún agente de ejecución debe implementar vinculación por email ni almacenar tokens OAuth sin
  una decisión explícita que reabra este ADR.
- La vinculación explícita de una identidad externa con un `app_user` autenticado, prevista
  arquitectónicamente en este ADR, queda diferida como funcionalidad a implementar: el primer
  incremento de Google (login/registro) no la incluye. Se retoma cuando exista una página de
  perfil/configuración desde la cual iniciarla.

La autenticación local de la Fase 4 y la preparación de `auth_identity` no habilitan todavía un
proveedor externo. Google se implementará inmediatamente después de cerrar esa fase, como un
incremento separado que reutiliza este ADR y la sesión server-side existente.
