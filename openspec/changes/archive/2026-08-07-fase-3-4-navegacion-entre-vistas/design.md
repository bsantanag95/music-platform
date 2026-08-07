## Context

Las vistas públicas de catálogo ya existen bajo el segmento `[locale]` y la navegación interna
de next-intl ya está centralizada en `src/i18n/navigation.ts`. `AlbumCard` ya conserva el locale
al enlazar al álbum, pero falta completar el recorrido con enlaces desde los créditos, un
encabezado global, cambio de idioma y breadcrumbs.

El detalle de álbum se obtiene mediante `getAlbumDetail`, que actualmente devuelve el
`release_group`, la edición, la carátula, los tracks y los créditos. El breadcrumb de álbum necesita además el artista principal del release_group; esa relación debe resolverse en el read-model y no inferirse desde créditos individuales de tracks ni en los componentes de presentación ni mediante una segunda inferencia desde la URL.

## Goals / Non-Goals

**Goals:**

- Mantener todas las rutas de página locale-aware usando `src/i18n/navigation.ts`.
- Exponer en el read-model el artista principal necesario para el breadcrumb del álbum.
- Hacer navegables los créditos destacados hacia perfiles de artista.
- Añadir `Header` y breadcrumbs reutilizables con mensajes localizados.
- Preservar la ruta actual al cambiar entre `es` y `en`.
- Header se integrará en el layout raíz localizado y será compartido por todas las rutas públicas bajo [locale].

**Non-Goals:**

- No crear una vista propia para recordings.
- No modificar el payload REST público salvo que el cambio sea estrictamente necesario; el
  artista principal es inicialmente un dato interno para la página.
- No añadir dependencias nuevas ni introducir estado global.
- No resolver el responsive y los error boundaries globales de la Etapa 3.6.

## Decisions

### 1. Resolver el artista principal dentro de `getAlbumDetail`

El read-model consultará la relación de crédito de nivel `release_group` con rol `primary` y
devolverá un objeto de artista mínimo (`id`, `name`) junto al detalle. Se elige esta opción
porque el servicio ya es la fuente compartida entre la página y el endpoint, y evita duplicar
consultas o asumir que el artista del breadcrumb coincide con un crédito de track.

Alternativas descartadas:

- Inferir el artista desde el `referer` o desde la ruta: frágil y no funciona en navegación
  directa.
- Hacer una consulta adicional desde `page.tsx`: duplica la lógica de catálogo y puede dejar
  página y read-model desincronizados.
- Cambiar primero el contrato REST: no es necesario para el render Server Component y ampliaría
  el alcance de la etapa.

Si no existe crédito primario de grupo, el álbum se renderiza sin el tramo de artista del
breadcrumb, manteniendo disponible el enlace a inicio y el título del álbum.

### 2. Usar navegación de next-intl en todos los enlaces de página

`Link`, `useRouter` y `usePathname` se importarán exclusivamente desde
`src/i18n/navigation.ts`. El selector de idioma usará la ruta actual y reemplazará únicamente
el locale, evitando construir URLs manualmente.

### 3. Mantener los componentes de presentación sin lógica de traducción

Los componentes resolverán traducciones mediante next-intl según su naturaleza Server/Client. Los datos musicales permanecerán sin traducir. Las nuevas claves vivirán en `messages/es` y `messages/en` con consistencia verificada por los tests existentes.

### 4. Mantener el endpoint REST compatible

La ampliación del read-model será interna. El route handler seguirá transformando el detalle al
shape REST actual, salvo que una prueba demuestre que el artista principal debe exponerse para
un consumidor existente. Así se evita una modificación de contrato innecesaria.

## Risks / Trade-offs

- **Un álbum puede no tener artista primario identificable** → renderizar breadcrumbs parciales
  de forma estable y cubrir el caso con tests.
- **Un crédito featured puede apuntar a un stub** → enlazar usando su UUID propio; el perfil ya
  aplica el enriquecimiento existente al visitarse.
- **Cambio de locale puede perder la ruta o sus parámetros** → usar `usePathname` y navegación
  de next-intl, con tests para `/es/album/<id>` y `/en/album/<id>`.
- **La lista de créditos puede mezclar roles** → conservar el filtro `featured` y no enlazar
  créditos primarios que no correspondan a colaboraciones visibles del track.
- **Añadir UI global puede afectar páginas existentes** → probar landing, búsqueda, artista y
  álbum en ambos locales antes de cerrar la etapa.

## Migration Plan

1. Añadir el contrato delta y los mensajes necesarios.
2. Extender el read-model y sus tipos sin cambiar inicialmente el shape REST público.
3. Implementar enlaces, Header, selector de locale y breadcrumbs.
4. Ejecutar typecheck, lint, tests y build; validar manualmente el flujo Pink Floyd / Roger
   Waters en ambos locales.

No requiere migración SQL ni pasos de despliegue especiales. El rollback consiste en revertir
los cambios de la etapa; no hay datos persistidos nuevos.

## Open Questions

No quedan decisiones de producto abiertas para esta etapa. La ausencia de artista primario se
trata como un caso válido de renderizado parcial según la decisión 1.
