## Context

La plataforma tiene dos intenciones de búsqueda distintas. `/search` resuelve artistas y álbumes del catálogo musical y redirige a una página de resultados; `/users` busca perfiles mediante un formulario cliente y muestra los resultados en la misma pantalla. La búsqueda social funciona, pero su enlace actual dentro del Header compite con la navegación principal y la página usa una composición mínima que no comunica la dimensión comunitaria del producto.

El cambio está limitado al frontend, la navegación contextual y los mensajes localizados. El endpoint `GET /api/users`, las reglas de privacidad, los estados de relación y las rutas de perfil permanecen sin cambios.

## Goals / Non-Goals

**Goals:**

- Separar claramente el descubrimiento musical del descubrimiento de usuarios.
- Hacer de `/users` una superficie social reconocible y atractiva, conservando su flujo de interacción simple.
- Mover la entrada principal fuera del Header y darle presencia contextual en Home, con respaldo permanente en Footer.
- Mantener responsive, accesibilidad, internacionalización y acciones de seguimiento existentes.

**Non-Goals:**

- No combinar resultados de `/search` y `/users`.
- No agregar búsqueda instantánea, filtros, recomendaciones, avatares ni cambios de datos.
- No cambiar endpoints, contratos REST, rutas públicas, privacidad ni lógica de relaciones.
- No rediseñar la página de perfil ni las demás superficies sociales.

## Decisions

### Búsquedas separadas

Se mantienen dos experiencias y dos destinos. La búsqueda musical y la social tienen entidades, resultados y acciones diferentes; combinarlas produciría una lista ambigua y complicaría la privacidad y el seguimiento.

**Alternativa descartada:** un buscador global único. Requiere ranking entre tipos incompatibles, introduce resultados inesperados y no aporta valor al flujo actual.

### Navegación de Usuarios

Se elimina el enlace fijo a `/users` del Header. Se añade un acceso contextual desde Home, asociado al descubrimiento de comunidad, y se conserva el enlace del Footer como punto estable de exploración. Los enlaces existentes desde actividad, listas y perfiles continúan funcionando.

**Alternativa descartada:** mantenerlo en el Header junto al buscador musical. Preserva discoverability, pero sobrecarga el encabezado y presenta como equivalentes dos tareas que el producto debe diferenciar.

### Composición visual

La página seguirá siendo una sola vista con formulario y resultados debajo. La estructura propuesta es un contenedor responsive con un encabezado editorial de comunidad, un panel de búsqueda destacado y una zona de resultados con tarjetas de usuario. En escritorio podrá usar una cuadrícula de tarjetas; en móvil volverá a una columna. Las tarjetas mostrarán únicamente los datos ya disponibles: nombre visible, username y acción/estado de relación.

Se reutilizarán los tokens existentes (`ink`, `ink-surface`, `ink-border`, `paper`, `paper-muted`, `amber`, `petrol`) y los componentes UI existentes. No se crearán patrones visuales propios que dupliquen `Button`, `Input`, `EmptyState` o `ErrorState`.

### Estado e interacción

`UserSearch` seguirá siendo un Client Component porque gestiona input, submit, resultados y acciones de seguimiento. Se conservará `useState` para el estado local: no hace falta TanStack Query ni debounce para el alcance actual. Las respuestas continuarán validándose con `UserSearchResponseSchema` mediante `apiFetch` y los errores seguirán resolviéndose por código localizado.

### Terminología

El lenguaje visible de navegación usará `Usuarios` en español y `Users` en inglés. Los nombres técnicos (`UserSearch`, `/users`, `/api/users`) no se renombran. La URL permanece estable para no romper enlaces de actividad, perfiles, tests o bookmarks.

## Risks / Trade-offs

- [Menor discoverability al retirar el Header] → Añadir un acceso visible en Home, mantener Footer y conservar enlaces contextuales desde contenido social.
- [La cuadrícula puede reducir la densidad de lectura] → Mantener el componente de tarjeta escaneable y usar una columna en viewport pequeño; validar ambas variantes visualmente.
- [El modelo no tiene avatar ni biografía pública] → Diseñar con identidad textual y no inventar datos ni introducir cambios de schema.
- [Cambios de textos pueden dejar claves inconsistentes entre locales] → Actualizar español e inglés juntos y ejecutar el test de consistencia de mensajes.
- [La página puede crecer fuera de viewport por navegación existente] → Verificar Header, Home y `/users` en móvil sin cambiar el alcance hacia un rediseño global.

## Migration Plan

No hay migración de datos ni despliegue especial. Implementar los cambios de componentes y mensajes en un solo cambio, ejecutar `typecheck`, `lint`, `test` y `build`, y revisar manualmente `/es/users` y `/en/users` en móvil y escritorio. El rollback consiste en revertir los archivos frontend y de mensajes; las rutas y el endpoint permanecen compatibles en todo momento.

## Open Questions

No quedan decisiones de producto bloqueantes para implementar este cambio. La elección entre tarjetas en cuadrícula o lista en escritorio queda como detalle de composición sujeto a la validación visual, sin modificar el comportamiento funcional.
