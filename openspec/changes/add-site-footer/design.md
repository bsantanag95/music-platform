## Context

La app usa Next.js App Router con un único layout de locale
(`src/app/[locale]/layout.tsx`) que ya monta el `Header` y resuelve la sesión
(`resolveSession`) para pasar `user` al `Header`. El sistema visual es propio
(tokens en `src/app/globals.css`: `ink` / `paper` / `amber` / `petrol`, fuentes
`font-display` / `font-body` / `font-data`, radios). i18n con `next-intl`,
namespaces por dominio en `messages/{locale}/<namespace>.json` cargados
explícitamente en `src/i18n/request.ts`; navegación siempre vía
`src/i18n/navigation.ts`; slugs de ruta neutros en inglés (ADR 0007).

`docs/03-data/data-licensing.md` define tres capas de datos con obligaciones
distintas: (A) metadata de MusicBrainz — CC0 en su mayoría, CC BY-NC-SA 3.0 para
datos suplementarios; (B) el servicio en vivo de MetaBrainz — requiere `User-Agent`
identificable con contacto; (C) Cover Art Archive — imágenes con copyright de las
disqueras, mostradas en baja resolución con fines de identificación. Ninguna de
estas atribuciones está hoy visible en la interfaz.

No existe pie de página ni páginas de políticas (`/terms`, `/privacy`, etc.).

## Goals / Non-Goals

**Goals:**

- Footer global, en todas las rutas y ambos locales, con la atribución de las tres
  capas de datos visible y persistente.
- Cerrar la navegación secundaria (enlaces que no justifican estar en el `Header`) y
  exponer los enlaces a políticas.
- Cero dependencias nuevas. Server Component por defecto; cliente solo si un control
  lo exige.
- Coherencia estricta con los tokens y con el patrón del `Header`
  (`border`, `font-data` para etiquetas de navegación, `hover:text-paper` / `amber`).
- Accesibilidad: landmark `contentinfo`, cada grupo en `<nav aria-label>`,
  encabezados reales, contraste AA, foco visible (ya global).

**Non-Goals:**

- Redacción legal definitiva de las políticas (solo placeholders).
- Selector de tema, newsletter, badges de tiendas, prensa/empleos.
- Crear cuentas de redes sociales o casilla de correo reales: el footer las enlaza
  como marcadores de posición.
- Banner de consentimiento de cookies (solo cookie de sesión esencial hoy).
- Tocar el `Header` o su selector de idioma (el footer no duplica el selector).

## Decisions

### 1. `Footer` como Server Component, montado en el layout de locale

Se monta en `src/app/[locale]/layout.tsx` después de `<Providers>{children}</Providers>`,
fuera de `<main>`. El layout ya resuelve la sesión; se reutiliza el mismo
`publicUser` que recibe el `Header` para la variante logueado/anónimo, sin una
segunda llamada a `resolveSession`.

- **Alternativa descartada:** footer por página. Rechazada — es chrome global
  idéntico en todas las rutas; duplicarlo es ruido y riesgo de divergencia.
- **Alternativa descartada:** Client Component con `useAuth`/fetch de `/api/auth/me`.
  Rechazada — el estado de sesión ya está disponible en el servidor en el layout;
  un fetch de cliente añade parpadeo y trabajo innecesario.

### 2. Contenido de sesión: renderizado condicional en el servidor, no dos footers

El grupo "Cuenta" cambia según haya `user`. Se resuelve con un condicional dentro
del mismo componente (igual que el `Header` hace con `currentUser`), no con dos
componentes. El resto del footer es idéntico en ambos casos.

### 3. "Volver arriba" como ancla, no como botón con JS

Se usa un `<a href="#top">` con un `id="top"` en el contenedor que envuelve el
contenido dentro del layout, en lugar de un handler `scrollTo`. Evita convertir el
footer en Client Component. El `scroll-behavior` suave se deja al CSS y ya está
cubierto por el `prefers-reduced-motion` global. Si en revisión se comprueba que el
salto de foco al destino no funciona en algún navegador objetivo, se añade
`tabindex="-1"` al destino; no se prevé JS.

- **Alternativa descartada:** botón flotante siempre visible. Rechazada — fuera de
  alcance y de estilo para esta app.

### 4. Bloque de atribución: texto con enlaces, una sección propia

El bloque vive en su propia franja con `border-t border-ink-border`, en
`font-body text-sm text-paper-muted`. Cada afirmación enlaza a su fuente con
`target="_blank" rel="noopener noreferrer"` y un indicador accesible de "abre en
pestaña nueva". Los nombres propios (MusicBrainz, Cover Art Archive, MetaBrainz
Foundation) **no se traducen**; el texto que los rodea sí (es *chrome*, no dato de
catálogo). Contenido normativo mínimo:

- Metadata del catálogo: MusicBrainz, CC0 en su mayoría, parte bajo CC BY-NC-SA 3.0.
- Carátulas: Cover Art Archive, baja resolución, fines de identificación, copyright
  de sus titulares.
- Servicio operado por la MetaBrainz Foundation.
- music-platform no está afiliada ni respaldada por la MetaBrainz Foundation.
- music-platform no reproduce ni aloja audio.

### 5. Namespace i18n `footer` propio

Se añade `messages/{es,en}/footer.json` y se registra en `src/i18n/request.ts`,
siguiendo la convención de namespaces por dominio. El contenido de las páginas
placeholder de políticas va en un namespace `legal` propio (mismo criterio), no
mezclado en `common`.

- **Alternativa descartada:** reutilizar `common`. Rechazada — `common` ya está
  cargado en todas las páginas y crecería con texto que solo usa el footer y cinco
  rutas estáticas.

### 6. Páginas de políticas: estáticas, localizadas, con placeholder honesto

`/about`, `/terms`, `/privacy`, `/cookies`, `/guidelines` como Server Components
estáticos con `generateMetadata`. El cuerpo es un marcador de posición explícito
("borrador / en preparación", fecha de última actualización vacía o "pendiente"),
no texto legal inventado. Así el footer queda completo sin que la app afirme tener
términos vigentes que no tiene.

- **Alternativa descartada:** no crear las páginas y omitir esos enlaces del footer.
  Rechazada — son bloqueantes conocidos para la beta y es preferible tener la ruta y
  el placeholder ya en su lugar; además evita rehacer el footer después.
- **Alternativa descartada:** enlazar a documentos externos (Notion, etc.).
  Rechazada — dependencia externa y sin control de estilo/i18n.

### 7. Estructura y responsive

Grid de 4 grupos (`identidad 1.5fr` + 3 × `1fr`) en `lg`; 2 columnas en `md`; 1
columna apilada en móvil, con los grupos como listas simples (pocos enlaces, sin
acordeón). El bloque de atribución pasa de línea fluida a párrafo. La barra inferior
pasa de fila a columna centrada. `overflow-x-clip` como en la home. Sin `sticky`.

### 8. Grupo "Conectar": contacto y redes sociales como marcadores de posición

El sitio todavía no tiene casilla de correo ni cuentas sociales, pero el footer debe
mostrar todas las vías de contacto y perfiles que tendrá. Se resuelve con una
**fuente única de verdad**, `src/lib/site-links.ts`, que exporta:

- `CONTACT_EMAIL` (casilla de rol, p. ej. `hola@<dominio-previsto>`), usada en un
  `mailto:` con la dirección visible como texto.
- `SOCIAL_LINKS`: lista ordenada `{ id, label, href }` para X, Instagram, Mastodon,
  Bluesky, Discord/comunidad y feed RSS. `href` apunta al handle/URL previsto.

Cada entrada lleva un comentario `TODO` y el módulo documenta en su cabecera que son
placeholders. Cambiar un canal real es editar una línea, sin tocar el componente ni
las traducciones. Los enlaces sociales se renderizan como lista de iconos/texto con
`aria-label` por red y `rel="noopener noreferrer me"`, `target="_blank"`.

- **Alternativa descartada:** ocultar el grupo hasta tener cuentas reales. Rechazada
  — el usuario pidió explícitamente que las vías de contacto/RRSS estén visibles
  desde ya, aunque sean provisionales.
- **Alternativa descartada:** `href="#"` en los sociales. Rechazada — un ancla vacía
  es peor para accesibilidad y lectores de pantalla que un enlace a la URL prevista;
  además obliga a volver a buscarlas después.
- **Nota:** al ser placeholders, los `href` externos aún inexistentes pueden dar 404;
  es aceptable y temporal, y `site-links.ts` es el único punto a corregir.

## Risks / Trade-offs

- **Enlaces del footer a páginas placeholder que parecen vacías** → El placeholder
  es explícito sobre su estado ("en preparación") y las páginas llevan `noindex`
  hasta tener contenido real, para no exponer términos falsos a buscadores.
- **La dirección de contacto es dato personal/operativo** → Se usa una casilla de
  rol (p. ej. `hola@` / `soporte@`), nunca un correo personal; se centraliza en
  `src/lib/site-links.ts` para cambiarla sin tocar componentes.
- **Enlaces sociales placeholder que dan 404** → Aceptado como estado temporal
  explícito; `site-links.ts` documenta que son provisionales y es el único punto de
  corrección cuando existan las cuentas.
- **Duplicación del selector de idioma (Header y Footer)** → Resuelto: el footer
  **no** incluye selector de idioma; se mantiene solo en el `Header`.
- **El texto de atribución puede quedar desactualizado si cambian las licencias de
  MetaBrainz** → El texto se mantiene deliberadamente general ("en su mayoría CC0",
  "parte bajo CC BY-NC-SA") y remite por enlace a la fuente autoritativa; se añade
  nota en `docs/03-data/data-licensing.md` de que el footer es el punto de
  materialización.
- **Crecimiento de payload i18n en todas las rutas** → El namespace `footer` es
  pequeño; `legal` solo se carga donde se use (páginas de políticas), no global.

## Migration Plan

Cambio puramente aditivo. Sin migración de base de datos, sin cambios de contrato.

1. Añadir namespaces i18n y registrarlos en `request.ts`; crear `src/lib/site-links.ts`.
2. Crear `Footer.tsx` y sus pruebas.
3. Montar en el layout (con `id="top"` en el contenedor de contenido).
4. Crear las cinco páginas de políticas con su namespace y metadata `noindex`.
5. Actualizar docs.

**Rollback:** quitar el montaje del `Footer` en el layout (una línea) revierte el
efecto visible; los namespaces y páginas nuevas quedan inertes.

## Open Questions

Todas resueltas por el propietario del producto:

- **Selector de idioma en el footer:** no. Se mantiene solo en el `Header`.
- **Casilla de contacto oficial:** no existe todavía. Se usa un placeholder en
  `src/lib/site-links.ts`, junto con enlaces sociales/RRSS también placeholder.
- **"Volver arriba":** entra en este cambio, como ancla sin JS.
- **Páginas de políticas:** en la raíz de `src/app/[locale]/`, sin route group.
