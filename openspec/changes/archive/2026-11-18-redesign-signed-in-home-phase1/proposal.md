## Why

La auditoría del Inicio con sesión (2026-11-17, cuenta con uso y cuenta recién creada; mockups en `mockups/home-signed-in-2026-11/`)
mostró que la acción que define el producto —anotar lo que se escuchó— no existe en Inicio: hay que ir al «+ Añadir» del Header o al
diario. La cabecera actual (`WelcomePanel`) es una caja de 768 px con el saludo, una «Última vez» pequeña y cinco accesos en dos columnas
(«Progreso» queda solo en su fila), y una cuenta nueva ve cuatro cajas de instrucciones apiladas antes de cualquier disco, con la pista
«marca tu primera escucha» repetida. Se eligió la dirección **C · Continuidad** (el mismo sistema que la portada pública ya rediseñada)
con el campo «¿Qué escuchaste hoy?» de B y su estante «Lo último que escuchaste» antes del feed. Esta es la Fase 1 de tres: la cabecera.

## What Changes

- La cabecera del Inicio con sesión pasa a ser una franja a lo ancho con el mosaico de carátulas de la portada de fondo (`wall.webp`),
  en dos columnas dentro del contenedor ancho (`max-w-[88rem]`):
  - Izquierda: el saludo como antetítulo («Buenas noches, @usuario»), el titular **«¿Qué escuchaste hoy?»**, un **campo de registro**
    con sugerencias de álbumes y canciones en línea, una línea de ayuda y los cinco accesos rápidos en una fila de mosaicos
    (Diario, Favoritos, Listas, Colección, Progreso).
  - Derecha: la tarjeta **«Última vez»** grande (carátula de 180 px, título, artista, tu valoración en forma de fila si existe, fecha
    relativa) con **«Lo volví a escuchar»** y «Ver disco».
- Elegir una sugerencia del campo abre el diálogo de acciones rápidas en **Escucha** con ese objetivo ya elegido: la escucha se crea
  como al elegirla en el diálogo del Header (audiencia privada, detalles opcionales).
- «Lo volví a escuchar» abre el mismo diálogo con el disco ya elegido y un paso de **confirmación** («Registrar escucha»): no se crea
  nada hasta confirmar.
- **Cuenta sin actividad** (sin escuchas, valoraciones, comentarios ni reseñas): la misma cabecera con «Te damos la bienvenida» como
  antetítulo, una línea que explica que el Inicio se llena con lo que anota y la gente que sigue, dos enlaces en prosa («buscar gente
  para seguir» y, si el onboarding está pendiente, «completar tu perfil musical») y el aviso de email pendiente como una línea dentro
  de la cabecera. A la derecha, una cuadrícula decorativa de carátulas del mosaico en lugar de «Última vez».
- Se quitan de la página el enlace suelto a `/welcome` (`WelcomeLink`, absorbido por la cabecera), la caja del aviso de email en su
  variante de Inicio y la pista «marca tu primera escucha» del bloque de onboarding social (queda cubierta por el campo).
- El diálogo de acciones rápidas acepta abrirse con un objetivo ya elegido y, opcionalmente, con confirmación previa en Escucha. Abierto
  desde «+ Añadir» se comporta igual que hoy.
- El resto del Inicio con sesión (feed, rastro, retomar lista, comunidad, comentarios, lanzamientos) no cambia en esta fase.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `home`: el orden y la composición de la cabecera con sesión (saludo, campo de registro, accesos rápidos, última vez); requisitos
  nuevos para registrar una escucha desde Inicio, la tarjeta «Última vez» y la cabecera de una cuenta sin actividad; el aviso de email
  pendiente pasa a vivir dentro de la cabecera.
- `header-quick-actions`: el diálogo puede abrirse desde otras superficies con un objetivo ya elegido y con confirmación previa en
  Escucha; la apertura desde «+ Añadir» conserva su comportamiento.

## Impact

- **Componentes:** `AuthenticatedHome`, `WelcomePanel` (reemplazado por `SignedInHero` + `LastTouchCard` + `HomeLogField`),
  `QuickLinks` (variante en mosaicos), `OnboardingPrompt` (sin la pista de primera escucha), `EmailVerificationNotice` (variante en
  línea), `WelcomeLink` (se elimina de Inicio), `QuickActionsDialog` y `ListenPanel` (objetivo inicial y confirmación).
- **Datos:** la valoración propia del objetivo de «Última vez» con `getOwnRatingRow` (`src/services/social.ts`), una consulta más en el
  render de Inicio; sin cambios de esquema, de API ni migraciones.
- **i18n:** claves nuevas en `messages/{es,en}/home.json` y `quickActions.json`; regenerar `src/i18n/client-messages.json`.
- **Docs:** `docs/05-features/home.md` (sección del Inicio con sesión y plan en tres fases). Ninguna página informativa ni legal
  describe la cabecera de Inicio; la Ayuda no cambia.
- Sin dependencias nuevas.
