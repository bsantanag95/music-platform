## Why

La aplicación no tiene pie de página. Hoy no hay ningún lugar visible donde vivan
la **atribución legal obligatoria** de las fuentes de datos (MusicBrainz, Cover Art
Archive, MetaBrainz), la navegación secundaria completa, ni los enlaces a las
políticas (términos, privacidad, cookies, directrices de la comunidad) que un
producto con contenido generado por usuarios necesita antes de abrir la beta.

`docs/03-data/data-licensing.md` es explícito: la atribución de estas tres capas de
datos es "el punto donde más proyectos similares se meten en problemas legales". El
footer es la superficie estándar donde se resuelve, y además cierra la navegación
global que hoy solo cubre el `Header`.

## What Changes

- **Nuevo componente `Footer`** (Server Component) montado en
  `src/app/[locale]/layout.tsx`, después del contenido y fuera de `<main>`, presente
  en todas las rutas y ambos locales.
- **Grid de navegación en cuatro grupos**: identidad + tagline, "Explorar" (buscar,
  gente, listas públicas, comunidad, cómo funciona), "Cuenta" (varía según sesión:
  entrar/registro para anónimo; perfil/ajustes/sesiones/salir para logueado) y
  "Recursos" (acerca de, ayuda, contacto).
- **Bloque de atribución de datos** a ancho completo: metadata por MusicBrainz
  (CC0 + CC BY-NC-SA 3.0), carátulas por Cover Art Archive (baja resolución, fines de
  identificación, copyright de sus titulares), servicio operado por MetaBrainz
  Foundation, aclaración de no afiliación, y aclaración de producto ("no reproduce ni
  aloja audio"). Cada afirmación enlaza a su fuente.
- **Barra inferior**: aviso de copyright con el año, y enlaces a Términos, Privacidad,
  Cookies y Directrices de la comunidad.
- **Páginas de políticas mínimas** en rutas neutras (`/about`, `/terms`, `/privacy`,
  `/cookies`, `/guidelines`), localizadas, con contenido de marcador de posición y
  metadata, para que ningún enlace del footer apunte a un 404. La redacción legal
  definitiva es trabajo aparte (ver Non-Goals).
- **Enlace de contacto** (`mailto:`) — requisito ya vigente por la política de
  `User-Agent` de MusicBrainz y por identificación del responsable de datos.
- **Nuevo namespace i18n `footer`** (`messages/{es,en}/footer.json`) registrado en
  `src/i18n/request.ts`.

### Goals

- Cumplir la atribución de MusicBrainz / Cover Art Archive / MetaBrainz de forma
  visible y persistente en todo el sitio.
- Cerrar la navegación global secundaria y los enlaces a políticas.
- Mantener coherencia total con el sistema de tokens y el patrón del `Header`.
- Accesible (landmark `contentinfo`, `nav` etiquetados, contraste AA) y responsive
  (4 → 2 → 1 columna) sin JavaScript de cliente salvo el estrictamente necesario.

### Non-Goals

- Redactar el texto legal definitivo de términos, privacidad, cookies o directrices
  de la comunidad — este cambio solo crea las páginas con marcador de posición.
- Newsletter, enlaces a redes sociales, badges de tiendas de apps (PWA es Fase 6),
  prensa/empleos, o selector de tema.
- Banner de consentimiento de cookies: hoy solo se usa la cookie de sesión
  `httpOnly` estrictamente necesaria, que no requiere consentimiento.
- Rediseñar o mover el selector de idioma del `Header`.

## Capabilities

### New Capabilities

- `site-footer`: pie de página global del sitio — estructura, navegación secundaria
  según estado de sesión, bloque de atribución de fuentes de datos, barra inferior
  de copyright y políticas, comportamiento responsive y accesibilidad.
- `legal-pages`: existencia de las rutas de políticas e información
  (`/about`, `/terms`, `/privacy`, `/cookies`, `/guidelines`) localizadas en `es` y
  `en`, con metadata y contenido de marcador de posición mientras no haya redacción
  definitiva.

### Modified Capabilities

_Ninguna._ El `Header` y la navegación existente no cambian su comportamiento.

## Impact

- **Frontend:**
  - Nuevo `src/components/layout/Footer.tsx` (Server Component) y, si hace falta un
    control interactivo (p. ej. "volver arriba"), un subcomponente cliente pequeño.
  - `src/app/[locale]/layout.tsx`: montaje del `Footer` y paso de `user` (ya se
    resuelve la sesión en el layout).
  - Nuevas páginas `src/app/[locale]/(...)/{about,terms,privacy,cookies,guidelines}/page.tsx`
    (Server Components estáticos con `generateMetadata`).
- **i18n:**
  - `messages/es/footer.json` y `messages/en/footer.json` (etiquetas de navegación,
    encabezados de grupo, textos de atribución, barra inferior, `aria-label`s).
  - `messages/{es,en}/common.json` o un namespace nuevo para el contenido de las
    páginas de políticas placeholder.
  - `src/i18n/request.ts`: registrar el/los namespace(s) nuevo(s).
- **Specs OpenSpec:** nuevos `specs/site-footer/spec.md` y `specs/legal-pages/spec.md`.
- **Docs:**
  - `docs/03-data/data-licensing.md`: nota de que la atribución se materializa en el
    footer.
  - `docs/02-architecture/frontend-plan/` o `docs/05-features/`: breve entrada del
    footer si corresponde al índice de features.
- **Sin cambios** en base de datos, API REST, contratos ni dependencias.
- **Pruebas:** `src/components/layout/Footer.test.tsx` (render, variante
  anónimo/logueado, presencia de enlaces de atribución y sus `href`, landmarks y
  `nav` etiquetados) y un test de humo de que cada página de políticas renderiza en
  ambos locales.
