## Context

La Fase 3 ya tiene páginas Server Component para búsqueda, artista y álbum, componentes
reutilizables para estados vacíos, errores y skeletons, y `LazyCoverImage` usa TanStack Query
para cargar carátulas después del primer render. La navegación entre vistas y la
internacionalización ya están implementadas, pero faltan boundaries de Next.js, estados de
carga por ruta, una política explícita para fallos de imagen y una revisión transversal de
responsive y accesibilidad.

La solución debe conservar el patrón de cacheo bajo demanda, el uso exclusivo de la API del
proyecto para datos remotos y la política de miniaturas de 250px. No hay cambios de datos
persistidos, endpoints ni dependencias externas.

## Goals / Non-Goals

**Goals:**

- Hacer observables y localizados los estados de carga, error, not-found y vacío.
- Mantener las páginas utilizables si una carátula falla de forma transitoria.
- Aplicar una corrección mobile-first mínima y coherente en las tres vistas.
- Verificar accesibilidad básica en los componentes y páginas existentes.
- Mantener el render inicial de las páginas independiente de la carga de carátulas.

**Non-Goals:**

- No crear una vista de canción ni ampliar contratos REST.
- No almacenar bytes de imágenes ni añadir proxy, CDN o telemetría.
- No cambiar el modelo de datos ni la resolución backend de Cover Art Archive.
- No convertir páginas Server Component en Client Component salvo que una interacción concreta
  lo requiera.

## Decisions

### 1. Boundaries y estados por segmento localizado

Se añadirán `error.tsx` y `not-found.tsx` bajo `src/app/[locale]/`, y `loading.tsx` en las
rutas públicas que ejecutan lecturas de catálogo. Los boundaries resolverán sus textos con
`useTranslations` y expondrán únicamente mensajes localizados, nunca el mensaje crudo de
`ApiError`.

Se reutilizarán `Skeleton`, `EmptyState` y `ErrorState` donde sus APIs actuales sean
suficientes. Los estados específicos del dominio se resolverán en el componente de catálogo
y pasarán texto explícito a los componentes UI.

Alternativa descartada: un spinner global en el layout, porque oculta qué parte está cargando y
no cubre correctamente navegación, not-found ni errores recuperables.

### 2. Reintentos limitados dentro de `LazyCoverImage`

La resiliencia se implementará en la capa cliente de la carátula, sin modificar el endpoint ni
la cache de base de datos. Se distinguirán dos fallos:

- fallo de consulta del endpoint: TanStack Query reintentará como máximo dos veces, con backoff
  controlado;
- fallo del `<Image>` después de recibir una URL: el componente hará como máximo dos reintentos
  visuales y luego mostrará `DiscPlaceholder`.

El estado de reintento mantendrá el skeleton/placeholder y no volverá a solicitar
indefinidamente la misma URL. El límite recomendado es dos reintentos después del intento
inicial, con esperas aproximadas de 250 ms y 750 ms. Los temporizadores se limpiarán al
desmontar el componente o cambiar el álbum.

Alternativa descartada: reintentos infinitos o resolver nuevamente la carátula desde el
servidor ante cada error de imagen, porque produciría tráfico innecesario y no corrige la
disponibilidad eventual del host redirigido.

### 3. Fallback estable y accesible

Cuando no haya URL, falle la consulta o se agoten los reintentos de imagen, se renderizará el
placeholder visual existente con un texto alternativo localizado. El error de una carátula no
afectará la tarjeta, la grilla, el tracklist ni la navegación.

Las carátulas que sí carguen conservarán `alt` basado en el nombre musical del álbum o artista;
los textos que describan estados de UI se traducirán desde los mensajes. Los skeletons usarán
`role="status"` y `aria-label` solo cuando exista un texto útil.

### 4. Responsive mediante ajustes locales

Se conservará Tailwind y el lenguaje visual existente. La revisión empezará por viewport móvil
y ajustará grids, cabeceras, breadcrumbs, tracklist, botones y contenedores para evitar
overflow horizontal. No se introducirá un sistema de diseño nuevo ni se rehacerán las páginas.

Alternativa descartada: crear una variante móvil separada, porque duplicaría markup y
facilitaría divergencias entre locales y tamaños de pantalla.

### 5. Configuración de imágenes basada en URLs reales

Se comprobará que el hostname de las URLs entregadas por backend está permitido en
`next.config.mjs`. Se mantendrá la resolución centralizada y la miniatura de 250px; solo se
añadirán patrones remotos si una URL válida actualmente rechazada por `next/image` lo exige.
No se construirán URLs nuevas ni se habilitará un wildcard innecesario.

### 6. Verificación en capas

Se añadirán tests unitarios para los estados nuevos, los límites de reintento y el fallback,
manteniendo los mensajes importados desde los catálogos. La validación final combinará
`typecheck`, `lint`, `test`, `build` y revisión manual del flujo Pink Floyd / Roger Waters en
`es` y `en`, en viewport móvil y escritorio.

## Risks / Trade-offs

- [El host redirigido de Cover Art Archive puede seguir fallando] -> El fallback evita romper la
  UI; se limita la mitigación a reintentos acotados y no se introduce almacenamiento propio.
- [Los reintentos pueden duplicar requests durante una navegación rápida] -> Se aplican límites,
  backoff, cleanup al desmontar y la deduplicación existente de TanStack Query.
- [Los boundaries pueden ocultar diferencias entre errores de API y not-found] -> Se conserva el
  mapeo por `ApiError.code` en las páginas y se reserva `notFound()` para recursos inexistentes.
- [Ajustes responsive pueden alterar snapshots o expectativas visuales] -> Se cubren los
  componentes afectados con tests y se valida manualmente en ambos locales.
- [Una mejora de accesibilidad puede requerir claves nuevas] -> Se sincronizan los mensajes de
  `es` y `en` en el mismo cambio y se evita hardcodear texto en componentes UI.

## Migration Plan

1. Añadir o ajustar mensajes localizados y tests de estado.
2. Implementar boundaries y `loading.tsx` sin cambiar los servicios de catálogo.
3. Implementar la política de reintentos y fallback de carátulas.
4. Ajustar responsive, accesibilidad y configuración de `next/image`.
5. Ejecutar la suite completa y la validación manual en ambos locales.

El despliegue no requiere migraciones ni pasos especiales. El rollback consiste en revertir los
cambios de frontend; no hay datos persistidos nuevos.

## Open Questions

No quedan decisiones de producto abiertas. La necesidad de añadir un hostname adicional a
`remotePatterns` se resolverá durante la validación con las URLs reales, manteniendo el patrón
mínimo necesario.
