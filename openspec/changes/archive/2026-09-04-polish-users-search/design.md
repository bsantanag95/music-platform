## Context

La superficie `/users` ya separa correctamente el descubrimiento social del catálogo musical y consume `GET /api/users` mediante `apiFetch` y `UserSearchResponseSchema`. La página mantiene el término y los resultados en estado local, muestra tarjetas textuales y dispone de `hasNext` en la respuesta del backend, pero no comunica el contexto de resultados, no ofrece carga incremental y reemplaza completamente el formulario cuando falla la request.

El cambio debe mejorar la experiencia sin alterar privacidad, relaciones sociales, rutas de perfil ni el contrato REST. El modelo de usuario no incluye avatar, por lo que la identidad visual debe derivarse de los datos públicos ya disponibles.

## Goals / Non-Goals

**Goals:**

- Mostrar una respuesta de búsqueda más legible, con término y cantidad visible.
- Ofrecer feedback accesible durante la primera búsqueda y las cargas siguientes.
- Mantener el formulario disponible ante errores recuperables.
- Dar más identidad a cada tarjeta sin introducir datos nuevos.
- Usar `page` y `hasNext` para cargar resultados adicionales con una acción explícita.
- Persistir el término en `/users?q=...` y restaurarlo al abrir la URL.
- Mantener una experiencia localizada, responsive y navegable por teclado.

**Non-Goals:**

- No modificar `GET /api/users`, su shape, orden o reglas de privacidad.
- No combinar usuarios con artistas o álbumes.
- No implementar debounce, búsqueda instantánea, filtros, recomendaciones ni scroll infinito.
- No incorporar almacenamiento de imágenes, avatares reales ni cambios de schema.
- No reemplazar `useState` por estado global o una nueva dependencia de fetching.

## Decisions

### Persistencia en la URL

La página recibirá `searchParams` y pasará `q` como `initialQuery` a `UserSearch`. Al enviar una búsqueda válida, el componente usará el router locale-aware para actualizar `/users?q=<término>` y ejecutará la request. Si existe un `q` inicial, la búsqueda se ejecutará al montar para que una URL compartida sea funcional, no solo un campo prellenado. Se usará `replace` para no generar una entrada del historial por cada ajuste menor del término.

**Alternativa descartada:** mantener todo en estado local. Es más simple, pero rompe recarga, enlaces compartidos y restauración mediante navegación del navegador.

### Paginación explícita

La primera request usará `page=1` y el `pageSize` existente. Si `hasNext` es verdadero, se mostrará un botón `Cargar más usuarios`; cada request posterior usará la siguiente página y agregará resultados al arreglo actual. El botón tendrá estado ocupado y no se mostrará cuando no queden páginas.

**Alternativa descartada:** scroll infinito. Requiere más control de intersección, puede disparar cargas inesperadas y es menos predecible para una búsqueda puntual.

### Estados de búsqueda

La request se modelará con estados locales de búsqueda inicial y carga de página adicional. Mientras carga la primera página se conservará el panel y se mostrarán skeletons; durante `Cargar más` se conservarán las tarjetas existentes. Un error no ocultará el formulario ni resultados previos: se mostrará un mensaje localizado en el panel y se podrá reintentar. Cualquier excepción que no sea `ApiError` se tratará como `INTERNAL_ERROR`.

**Alternativa descartada:** devolver solo `ErrorState`. El patrón actual oculta la acción principal y obliga a una navegación mental innecesaria para volver a editar el término.

### Identidad de las tarjetas

`UserCard` añadirá un monograma derivado de `displayName ?? username`, manteniendo nombre y username como contenido principal. El monograma será decorativo o tendrá texto alternativo redundante según el contexto, y no implicará que el sistema tenga una foto de perfil. La zona de acción será flexible: en móvil podrá ocupar una segunda línea para no recortar etiquetas como `Solicitud enviada` o `Iniciar sesión para seguir`.

**Composición de la lista:** los resultados se renderizan como una lista de una sola columna a lo ancho de la página (patrón coherente con los resultados del catálogo en `/search`). La cuadrícula de dos columnas recortaba demasiado el nombre y el `@username` al restarles ancho el monograma y la acción, así que se optó por la lista de ancho completo para priorizar la legibilidad de la identidad de cada usuario.

**Alternativa descartada:** agregar una columna `avatar_url`. No es necesaria para resolver el problema visual y ampliaría el alcance de datos, almacenamiento y privacidad.

### Semántica y mensajes

La lista conservará `ul`/`li`, los perfiles seguirán siendo enlaces y las acciones seguirán usando `FollowButton`. La zona de resultados tendrá un encabezado y un estado accesible (`role=status`, `aria-busy`) sin anunciar contenido redundante. Las nuevas claves vivirán en `messages/{locale}/users.json`; los nombres de usuario no se traducen.

## Risks / Trade-offs

- [Una búsqueda inicial desde `q` puede producir una request adicional al hidratar] → Centralizar la función de búsqueda y protegerla contra ejecución duplicada cuando el término inicial no cambie.
- [El botón de paginación puede recibir varios clicks] → Deshabilitarlo durante la request y calcular la próxima página desde el estado actual.
- [Un monograma no reemplaza una fotografía] → Tratarlo como identificador visual neutro y no presentarlo como avatar del usuario.
- [La cantidad mostrada puede ser solo la cantidad cargada, no el total] → Etiquetar el texto como resultados cargados cuando `hasNext` sea verdadero.
- [Términos largos pueden desbordar la cabecera] → Aplicar truncamiento controlado y conservar el término completo en un atributo accesible.
- [Errores de traducción entre locales] → Actualizar ambos catálogos y ejecutar el test de paridad existente.

## Migration Plan

No se requieren migraciones de base de datos ni cambios del endpoint. Implementar primero la lectura/escritura de `q`, después los estados y paginación, y finalmente el refinamiento de tarjetas y mensajes. Validar con tests unitarios de búsqueda, paginación, error y tarjeta, seguido de `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`. El rollback consiste en revertir los componentes y catálogos; `/users` continuará siendo compatible durante todo el cambio.

## Open Questions

No hay decisiones bloqueantes. La copy final de la cabecera de resultados puede ajustarse durante la revisión visual siempre que conserve la distinción entre resultados cargados y resultados finales.
