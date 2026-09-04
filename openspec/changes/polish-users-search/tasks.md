## 1. Persistencia De La Búsqueda

- [x] 1.1 Leer `searchParams.q` en la página `/users` y pasarlo como `initialQuery` a `UserSearch` usando la firma de Next.js 15.
- [x] 1.2 Actualizar la URL con `q` mediante el router locale-aware al enviar una búsqueda válida, sin cambiar de superficie ni mezclarla con `/search`.
- [x] 1.3 Ejecutar automáticamente la búsqueda cuando la página se abre con un `q` válido y evitar requests duplicadas durante la inicialización.

## 2. Estados Y Paginación

- [x] 2.1 Separar los estados de búsqueda inicial y carga incremental, manteniendo los resultados existentes durante `Cargar más`.
- [x] 2.2 Mostrar skeletons y un estado accesible mientras se ejecuta la búsqueda inicial.
- [x] 2.3 Añadir cabecera localizada con el término buscado y la cantidad de resultados cargados, distinguiendo si quedan más páginas.
- [x] 2.4 Implementar el botón localizado de paginación usando `page`, `pageSize` y `hasNext`, agregando resultados sin reemplazar los anteriores.
- [x] 2.5 Mantener visible el formulario y los resultados previos ante errores iniciales o de paginación, permitiendo reintentar sin perder el término.
- [x] 2.6 Tratar excepciones desconocidas como `INTERNAL_ERROR` y conservar el manejo localizado por código de `ApiError`.

## 3. Identidad Y Responsive De Tarjetas

- [x] 3.1 Añadir un monograma determinista derivado del nombre visible o username, sin introducir avatares ni cambios de modelo.
- [x] 3.2 Ajustar `UserCard` para separar identidad, estado y acción social, permitiendo que la zona de acción se adapte a móvil.
- [x] 3.3 Verificar estados `none`, `following`, `requested`, `self`, `blocked` y visitante anónimo sin truncar acciones ni generar overflow.
- [x] 3.4 Añadir estilos de focus visibles y conservar navegación completa por teclado.

## 4. Traducciones, Tests Y Documentación

- [x] 4.1 Añadir y sincronizar mensajes ES/EN para resultados, carga incremental, skeletons, errores y estados accesibles.
- [x] 4.2 Ampliar tests de `UserSearch` para URL, búsqueda inicial desde `q`, carga, paginación, error recuperable y ausencia de requests duplicadas.
- [x] 4.3 Ampliar tests de `UserCard` para monograma, estados sociales, focus y layout semántico.
- [x] 4.4 Añadir o actualizar tests de la página `/users` para propagar `searchParams` y conservar la separación con `/search`.
- [x] 4.5 Actualizar `docs/05-features` y la especificación de `social-profiles` con el comportamiento final.
- [x] 4.6 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [x] 4.7 Revisar `/es/users` y `/en/users` mediante inspección responsive del código, tests de estados y build de ambas rutas (búsqueda compartida, vacíos, errores y paginación); el barrido visual final en navegador queda pendiente — Playwright no está instalado.
