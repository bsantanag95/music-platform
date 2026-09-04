## 1. Navegación Y Terminología

- [x] 1.1 Retirar el enlace fijo a `/users` de la navegación principal del Header sin afectar el enlace al perfil autenticado.
- [x] 1.2 Añadir un acceso contextual a Usuarios en Home, dentro de la experiencia de descubrimiento de comunidad, con navegación locale-aware.
- [x] 1.3 Actualizar las etiquetas visibles de navegación y exploración de `Personas` a `Usuarios` en los mensajes de español y sus equivalentes en inglés.

## 2. Superficie De Búsqueda

- [x] 2.1 Rediseñar la composición de `src/app/[locale]/users/page.tsx` con encabezado de comunidad, jerarquía editorial y contenedor responsive.
- [x] 2.2 Rediseñar `UserSearch` manteniendo el submit explícito, la búsqueda por API, la validación local y los estados de carga, vacío y error localizados.
- [x] 2.3 Rediseñar `UserCard` para mostrar con claridad nombre visible, username y estado/acción de relación, usando únicamente datos existentes.
- [x] 2.4 Aplicar los tokens visuales existentes y verificar que la superficie no introduce overflow horizontal en móvil ni escritorio.

## 3. Pruebas Y Documentación

- [x] 3.1 Actualizar o ampliar los tests de `Header`, `UserSearch`, `UserCard` y Home para cubrir la nueva ubicación, nomenclatura y estados principales.
- [x] 3.2 Verificar que las claves de traducción de español e inglés permanezcan sincronizadas y que los textos visibles no queden hardcodeados.
- [x] 3.3 Actualizar la documentación de producto o feature social si la nueva ubicación y terminología requieren reflejarse fuera de OpenSpec.
- [x] 3.4 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`.
- [x] 3.5 Revisar `/es/users` y `/en/users` mediante la inspección responsive de la implementación, las pruebas de estados y el build de ambas rutas, incluyendo búsqueda válida, sin resultados, error y acciones de seguimiento.
