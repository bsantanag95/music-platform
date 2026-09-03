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
- Selector de tema, newsletter, redes sociales, badges de tiendas, prensa/empleos.
- Banner de consentimiento de cookies (solo cookie de sesión esencial hoy).
- Tocar el `Header` o su selector de idioma.

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

Se usa un `<a href="#top">` con un `id="top"` (o el `<main>` como destino) en lugar
de un handler `scrollTo`. Evita convertir el footer en Client Component. El
`scroll-behavior` suave se deja al CSS y ya está cubierto por el
`prefers-reduced-motion` global. Si en revisión se decide que el salto de foco
necesita gestión explícita, se aísla en un subcomponente cliente mínimo; se marca
como Open Question.

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

### 8. Enlace de contacto

`mailto:` con la dirección visible como texto (no solo "Contacto"). Cumple la
exigencia de `User-Agent` identificable de MusicBrainz y la identificación del
responsable de datos. La dirección concreta se toma de una constante/variable de
entorno existente si la hay; si no, se define una y se documenta.

## Risks / Trade-offs

- **Enlaces del footer a páginas placeholder que parecen vacías** → El placeholder
  es explícito sobre su estado ("en preparación") y las páginas llevan `noindex`
  hasta tener contenido real, para no exponer términos falsos a buscadores.
- **La dirección de contacto es dato personal/operativo** → Se usa una casilla de
  rol (p. ej. `hola@` / `soporte@`), nunca un correo personal; se centraliza en una
  sola constante para cambiarla sin tocar componentes.
- **Duplicación conceptual del selector de idioma (Header y Footer)** → Se decide
  **no** incluirlo en el footer en este cambio (Open Question) para no duplicar
  lógica de `handleLocaleChange`; si se incluye luego, se extrae a un componente
  compartido.
- **El texto de atribución puede quedar desactualizado si cambian las licencias de
  MetaBrainz** → El texto se mantiene deliberadamente general ("en su mayoría CC0",
  "parte bajo CC BY-NC-SA") y remite por enlace a la fuente autoritativa; se añade
  nota en `docs/03-data/data-licensing.md` de que el footer es el punto de
  materialización.
- **Crecimiento de payload i18n en todas las rutas** → El namespace `footer` es
  pequeño; `legal` solo se carga donde se use (páginas de políticas), no global.

## Migration Plan

Cambio puramente aditivo. Sin migración de base de datos, sin cambios de contrato.

1. Añadir namespaces i18n y registrarlos en `request.ts`.
2. Crear `Footer.tsx` y sus pruebas.
3. Montar en el layout.
4. Crear las cinco páginas de políticas con su namespace y metadata `noindex`.
5. Actualizar docs.

**Rollback:** quitar el montaje del `Footer` en el layout (una línea) revierte el
efecto visible; los namespaces y páginas nuevas quedan inertes.

## Open Questions

- ¿El footer incluye selector de idioma propio, o se mantiene solo en el `Header`?
  (Propuesta del diseño: solo Header en este cambio.)
- ¿Existe ya una casilla de contacto oficial y una constante para ella, o se define
  en este cambio?
- ¿"Volver arriba" entra en este cambio o se difiere? (Propuesta: entra, como ancla
  sin JS.)
- ¿Las páginas de políticas van en un route group existente
  (`(catalog)` no corresponde) o en la raíz de `[locale]`? (Propuesta: raíz de
  `[locale]`, sin group.)
