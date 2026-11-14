# ADR 0060 — Páginas informativas y legales como un conjunto con una sola regla de mantenimiento

## Estado

Aceptado (cambio `add-info-and-legal-pages`, 2026-11). Reemplaza los marcadores de posición del cambio
`add-site-footer` sin reescribirlo.

## Contexto

Los enlaces del pie eran marcadores de posición: `/help` no existía (404), «Cómo funciona» y «Acerca de» apuntaban a la
misma página, `/terms`, `/cookies` y `/guidelines` eran una frase, y `/privacy` solo describía lo que ya existía de la
cuenta. Además, el pie cargaba con un bloque de cinco párrafos de «Fuentes de datos»: transparencia de producto metida
en la navegación. Los textos legales son un riesgo particular: se desactualizan en silencio cuando cambia el código
(una cookie nueva, un proveedor nuevo, una regla de moderación) y prometer de más es peor que no decir nada.

## Decisión

1. **Siete páginas, una sola vista.** `/about`, `/about/data-sources`, `/help`, `/guidelines`, `/terms`, `/privacy` y
   `/cookies` se renderizan con `InfoPageView` (servidor, presentacional) a partir de un contenido estructurado
   (`title`, `lead`, `sections[]` con párrafos, lista o tabla). El registro `src/lib/info-pages.ts` es la fuente única de
   qué páginas existen, su ruta, la fecha de su última modificación y si esperan revisión legal. Los textos viven en
   `messages/{es,en}/info.json` (informativas) y `legal.json` (políticas), se leen con `t.raw` y admiten un solo marcado:
   `[texto](destino)` para enlaces. `{appName}`, `{contactEmail}` y `{takedownContact}` se sustituyen desde `common` y
   `site-links`, para que ni el nombre provisional ni los correos queden escritos a mano.
2. **«Fuentes de datos» sale del pie y cuelga de «Acerca de».** Es transparencia sobre el producto (qué viene de dónde,
   licencias, límites), no navegación. El pie conserva una atribución de dos frases —MusicBrainz, Cover Art Archive,
   no afiliación con MetaBrainz y, si está configurado, el contacto de retiro de carátulas—, sin encabezado ni enlace a la
   página, porque es lo que `data-licensing.md` exige que sea visible y persistente. El detalle largo vive en
   `/about/data-sources`, que se alcanza desde «Acerca de» y desde el pie de cada página informativa.
3. **Las políticas dicen solo lo que el código hace hoy.** Todo lo que depende de información que el proyecto no tiene
   (entidad responsable, jurisdicción, edad mínima, proveedores de alojamiento, plazos de copias de seguridad, brechas,
   revisión de decisiones de moderación) se lista en una sección «Por definir» al final del documento en vez de
   afirmarse. Mientras `pendingLegalReview` sea verdadero, Términos, Privacidad y Cookies muestran un aviso, no se
   indexan y esa lista es obligatoria. Pasarlo a `false` es el gesto de «revisado por una persona abogada».
4. **El mantenimiento es parte del cambio.** Quien modifique una funcionalidad que afecte lo que estos textos afirman
   actualiza el texto en ambos idiomas, la fecha de la página y la sección «Por definir» en el mismo cambio. La regla
   está en `AGENTS.md`; `docs/05-features/info-pages.md` mapea qué cambio de código obliga a tocar qué página. Los tests
   guardan lo comprobable: paridad `es`/`en`, que no haya enlaces internos rotos y que cada cookie que el código crea esté
   en la tabla de la política de cookies.

## Alternativas descartadas

- **Mantener «Fuentes de datos» en el pie.** Contradice el propósito de un pie de navegación y duplica la página que la
  transparencia necesita. Quitar también la atribución corta sería incumplir la licencia.
- **Un archivo Markdown/MDX por página.** Añade una dependencia y un segundo sistema de traducción; el contenido es corto,
  estructurado y ya hay `next-intl`.
- **Un banner de consentimiento ya.** Hoy solo hay cookies necesarias y de preferencia; el banner sin cookies que lo
  requieran es ruido. La política lo deja como punto por definir (la cookie `tz` se crea sin acción de la persona).

## Consecuencias

- Los textos son una promesa pública: un cambio de comportamiento que no se refleje en ellos es un defecto, no una
  omisión de documentación.
- Falta, y lo debe aportar una persona: la entidad legal, la jurisdicción, la edad mínima, los proveedores, la revisión
  legal y un buzón de contacto real (hoy `CONTACT_EMAIL` es un marcador de posición). Está listado en las propias páginas
  y en `docs/05-features/info-pages.md`.
- Los mensajes de las páginas se cargan solo en el servidor: no entran en `client-messages.json`.
