## 1. Diálogo de acciones rápidas con objetivo inicial

- [x] 1.1 `ListenPanel`: prop `confirm` que, antes de crear, muestra el objetivo con «Registrar escucha» (foco al montar) y «Elegir otro» (`onReset`); solo al confirmar llama a `createListenEntry` y sigue el flujo actual
- [x] 1.2 `QuickActionsDialog`: props `initialTarget?: PickTarget` y `confirmListen?: boolean`; con `initialTarget` abre en Escucha con el panel montado y no enfoca el buscador; sin ellas, comportamiento actual intacto
- [x] 1.3 Textos nuevos en `messages/{es,en}/quickActions.json` (confirmación, «Registrar escucha», «Elegir otro»)
- [x] 1.4 Tests: apertura con objetivo sin confirmación crea la escucha; con confirmación no crea hasta confirmar; «Elegir otro» vuelve al buscador sin crear; apertura desde «+ Añadir» sin cambios

## 2. Campo de registro en Inicio

- [x] 2.1 `HomeLogField` (cliente): combobox sobre `useTargetSearch` con selector Álbum | Canción, lista flotante con carátula/título/subtítulo/año, estados cargando/sin resultados/error, teclado (flechas, `Enter`, `Escape`), mínimo de dos letras
- [x] 2.2 Elegir una opción monta `QuickActionsDialog` con `initialTarget`; al cerrar vacía el campo y devuelve el foco; `Enter` sin opción activa no hace nada
- [x] 2.3 Tests: sugerencias desde dos letras, elegir con teclado y con clic abre el diálogo con el objetivo, `Enter` sin opción no navega, `Escape` cierra la lista, cambio a Canción

## 3. Cabecera con sesión

- [x] 3.1 `SignedInHero` (server): franja a sangre completa con `wall.webp` decorativo (máscara a la derecha, `aria-hidden`), contenedor `max-w-[88rem]`, dos columnas desde `lg`, orden móvil antetítulo → titular → campo → ayuda → accesos → tarjeta
- [x] 3.2 Antetítulo con `Greeting` y nombre enlazado al perfil; `<h1>` visible «¿Qué escuchaste hoy?» en lugar del `<h1 class="sr-only">`
- [x] 3.3 `QuickLinks` en mosaicos (sin prop de layout: su único uso era la cabecera): cinco mosaicos en fila (icono + rótulo, objetivo de toque ≥ 44 px, fila con desplazamiento horizontal por debajo de `sm`)
- [x] 3.4 `LastTouchCard`: carátula 180/104 px, antetítulo «Última vez · fecha relativa», título, artista, valoración propia en fila (`StarRatingValue`; de la entrada si es valoración, si no `getOwnRatingRow`), «Lo volví a escuchar» (cliente, diálogo con confirmación, foco de vuelta al botón) y «Ver» rotulado por tipo
- [x] 3.5 Variante sin actividad (`lastTouch === null`): «Te damos la bienvenida», línea explicativa, enlaces en prosa a `/users` y, si `onboardingPending`, a `/welcome`; cuadrícula decorativa de 8 carátulas del mosaico desde `lg`
- [x] 3.6 `EmailVerificationNotice variant="inline"` dentro de la cabecera; eliminar la variante `home` sin uso
- [x] 3.7 `AuthenticatedHome`: montar `SignedInHero` en lugar de `WelcomePanel`, quitar `WelcomeLink` y la caja del aviso de email; `YearInvitationCard` y el resto del cuerpo sin cambios
- [x] 3.8 `OnboardingPrompt`: quitar la pista `onboardingLogFirstListen`; eliminar `WelcomePanel`, `WelcomeLink` y claves sin uso
- [x] 3.9 Textos nuevos en `messages/{es,en}/home.json` (titular, ayuda, bienvenida, enlaces, «Lo volví a escuchar», «Ver disco/canción/artista»), en tuteo y en ambos idiomas
- [x] 3.10 Tests de `SignedInHero`/`LastTouchCard`/`AuthenticatedHome`: cuenta con uso (tarjeta con y sin valoración), cuenta sin actividad (con y sin onboarding pendiente), aviso de email solo sin verificar, sin `WelcomeLink`

## 4. Documentación

- [x] 4.1 `docs/05-features/home.md`: sección del Inicio con sesión (cabecera nueva, campo, «Última vez», cuenta sin actividad, aviso en línea), plan en tres fases y «Pendiente» («Lo escuché» de un toque, discos de arranque)
- [x] 4.2 `pnpm run i18n:client-messages` y revisar el diff de `src/i18n/client-messages.json`

## 5. Verificación

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 5.2 Revisar en el navegador con sesión (cuenta con uso y cuenta sin actividad) a 1440, 1024, 820 y 390 px: sin desbordamiento horizontal, campo visible sin desplazar a 390 px, registrar desde el campo y desde «Lo volví a escuchar» (cancelar y confirmar), foco y `Escape`
- [x] 5.3 Borrar las escuchas y la cuenta de prueba creadas para la verificación
