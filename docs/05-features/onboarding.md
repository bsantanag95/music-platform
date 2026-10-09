# Onboarding guiado (tres pasos)

**Fase 1 de `redefine-content-hierarchy` · cambios `add-two-door-onboarding`,
`improve-welcome-onboarding` y `redesign-welcome-flow` · Estado: ✅ implementado**

Un usuario recién registrado aterriza en **`/[locale]/welcome`**: tres pasos con un
indicador «Paso N de 3», ninguno obligatorio. Solo un paso es visible a la vez; se puede
avanzar, retroceder y saltar cualquiera, y lo elegido se conserva al ir y volver (los tres
pasos viven montados y el inactivo se oculta con `hidden`). El flujo nació como «dos puertas»
(de ahí los nombres «Puerta 1» y «Puerta 2», que se conservan en código, docs e historial):

1. **Puerta 1 — "Álbumes que te definen"** (identidad): *"¿qué música te representa?"*
2. **Paso de artistas — "Artistas que quieres seguir"**: alimenta «De tus artistas» en los
   lanzamientos de Inicio.
3. **Puerta 2 — "¿Qué estás escuchando ahora?"** (presente): *"¿qué está pasando contigo
   ahora?"*

## Puerta 1 — los álbumes elegidos se guardan como favoritos

"¿Qué álbumes te definen?" y "¿cuáles son tus álbumes favoritos?" son la misma pregunta
(IQ5): no hay colección temporal aparte. El usuario busca álbumes y elige entre 3 y 5
(tope 6). Al guardar:

- se crea el `favorite` de álbum de cada uno que falte, con la audiencia que resuelve
  `resolveNewContentAudience(userId, "favorite")` (preferencia del usuario o, sin ella, `public`),
  la misma de un favorito creado después. Antes se insertaba sin audiencia y la columna caía en su
  `DEFAULT 'followers'`; los favoritos ya sembrados no se reescriben (se cambian desde Favoritos); no se fijan ni se ordenan: se ven en la sección Favoritos del perfil (el cambio
  `simplify-profile-curation` retiró la sección "Álbumes favoritos" y la tabla `user_album_pin`);
- **no** se crea ningún `rating` ("esto me representa" ≠ "5 estrellas");
- **no** se crea ninguna entrada de diario (el onboarding construye identidad, no registra
  consumo).

Los álbumes que definen al usuario se eligen después desde la Tarjeta de Identidad del perfil.

**Búsqueda** (cambio `improve-welcome-onboarding`): usa el mismo motor que el diálogo «Añadir»
(`useTargetSearch`: coincidencias locales primero, búsqueda completa después, con cancelación) y
acota la búsqueda completa a **álbumes de estudio** (`category=studio`): sin el filtro, «dark side of
the moon» no traía el disco de Pink Floyd entre 33 sencillos y versiones. Cada fila muestra artista,
año y —si no es de estudio— el tipo, para distinguir homónimos. Al elegir un álbum el texto se limpia
y el foco vuelve al campo. El ranking de la búsqueda completa sigue sin poner primero al álbum
conocido cuando hay cientos de homónimos (trabajo aparte).

## Puerta 2 — registrar el presente

El usuario busca un álbum o una canción y, al elegirlo, se crea una **entrada de diario**
con el flujo existente: contexto inferido, audiencia por defecto, **sin pedir reacción ni
impresión** (OQ1 — se agregan después desde el diario, cuando el usuario quiera expresar
algo más). Puede registrar varias. La Puerta 2 por sí sola **no cierra** el onboarding.

Con «Canción» la lista ofrece **todas** las canciones registrables (`purpose: "pick"`), no solo la
primera: antes «Bohemian Rhapsody» ofrecía la versión de Rolf Harris y «Blinding Lights» no dejaba
registrar la de The Weeknd. Lo registrado sale de los resultados y se lista aparte con **Deshacer**
(`DELETE /api/me/diary/{id}`): un clic repetido no duplica la entrada y un clic errado se corrige. Un
fallo de búsqueda se dice como error, nunca como «Sin resultados».

## Paso de artistas

El usuario busca artistas y, al elegir uno, lo sigue de inmediato (`PUT /api/artists/{id}/follow`,
idempotente y sin tope). Lo seguido sale de los resultados y se lista aparte con «Dejar de seguir»
(`DELETE`), igual que la Puerta 2 con «Deshacer»; un clic repetido no repite la solicitud. No pide
mínimo ni máximo y no cierra el onboarding. Un seguimiento fallido se dice como error y no se lista.

## Aviso de audiencia

Los pasos de álbumes y de escucha dicen con quién se comparte lo que se elige («Visibilidad de tus
favoritos: Público», «Visibilidad de tu diario: Solo tú») y enlazan a Privacidad y audiencia en
una pestaña nueva (no pierde lo elegido). La página resuelve las audiencias en el servidor con
`resolveNewContentAudience`, la misma función que usan los servicios al crear contenido, así que el
aviso nunca contradice lo que se guarda. El paso de artistas aclara que seguir puede aparecer en la
actividad según la privacidad del perfil.

## Salida y resumen

Un solo botón de salida en los pasos 1 y 2: «Saltar por ahora» si no se hizo nada y «Terminar ahora»
si ya hay algo; ambos guardan los álbumes elegidos (antes «Saltar» los descartaba en silencio). El paso
3 termina con «Terminar». Tras el cierre (`POST /api/me/onboarding`) se muestra un **resumen** («Todo
listo»: favoritos guardados, artistas seguidos, escuchas registradas —solo los conteos mayores que
cero—) con los siguientes pasos: Ir a Inicio, Explorar (solo si `EXPLORE_ENABLED` lo permite) y
Buscar gente. Es estado del cliente, sin ruta propia: recargar redirige a Inicio.

**Saltar sigue fijando `onboarded_at`** aunque no se haya hecho nada. Dejarlo nulo haría que el login con
Google (que envía a `/welcome` mientras sea nulo) devolviera a la persona al flujo en cada inicio de sesión.

## Una sola vez

`app_user.onboarded_at` (nulo = pendiente). Se fija al **completar o saltar** el flujo,
mediante `POST /api/me/onboarding` (que también siembra los álbumes de la Puerta 1).
Mientras sea nulo:

- la redirección post-alta (formulario local y Google) lleva a `/welcome`;
- Inicio muestra un enlace pasivo "completá tu perfil musical" → `/welcome`.

Una vez fijado, `/welcome` redirige a Inicio y los dos accesos anteriores desaparecen. Los
usuarios que ya existían cuando se introdujo la capacidad quedaron marcados como
onboardeados (`onboarded_at = created_at`): nunca ven `/welcome`.

`POST /api/me/onboarding` es idempotente: llamarlo para un usuario ya onboardeado devuelve
`200` sin re-sembrar ni re-marcar.

## Aviso de verificación de email en bienvenida

Si el usuario recién registrado tiene el email sin verificar (`email_verified_at` nulo),
`/welcome` muestra un aviso discreto antes del primer paso. El aviso explica que la
cuenta puede usarse antes de verificar, ofrece reenviar el enlace de verificación y no
bloquea el onboarding. Es un aviso discreto (botón secundario, ~150 px en móvil) para que el
primer campo de búsqueda no quede bajo el pliegue. El usuario puede completar o saltar el flujo normalmente. Ver
`docs/02-architecture/auth.md` sección 9 para el detalle del modo soft.

## Distinto del onboarding social de Inicio

`AuthenticatedHome` ya muestra un bloque de onboarding **social** (`OnboardingPrompt`)
cuando el usuario no sigue a nadie: buscar gente, explorar listas públicas, registrar la
primera escucha. Ese bloque se conserva y es otra preocupación:

| | Onboarding guiado (`/welcome`) | Bloque social de Inicio |
|---|---|---|
| Pregunta | "¿quién sos musicalmente?" | "¿con quién te conectás?" |
| Se muestra | una vez, tras el alta | mientras no sigas a nadie |
| Escribe | Favoritos de álbum / seguimientos de artista / entrada de diario | nada (solo enlaces) |

## Modelo de datos

| Tabla / columna | Qué |
|---|---|
| `app_user.onboarded_at` | `TIMESTAMPTZ` nullable (migración 0020). Nulo = onboarding pendiente. Se fija al completar o saltar `/welcome`. |
| `favorite` | Escrito por la Puerta 1 (`seedFavoriteAlbums`, solo crea los que faltan). Sin cambios de esquema. |
| `listen_entry` | Escrito por la Puerta 2 (reusa `createListenEntry`). Sin cambios de esquema. |

## Móvil y accesibilidad

Controles de 44 px de alto y campos de 16 px en móvil (iOS hace zoom con menos). Las carátulas de las
listas de resultados son decorativas y se ocultan a los lectores de pantalla (cada una era una región
`status` vacía); el estado de la búsqueda y el contador de elegidos se anuncian (`aria-live`); «Quitar» y
«Deshacer» nombran el elemento.
