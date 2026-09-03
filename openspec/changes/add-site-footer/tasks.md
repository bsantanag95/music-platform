## 1. i18n: namespaces nuevos

- [ ] 1.1 Crear `messages/es/footer.json` y `messages/en/footer.json` con: encabezados
  de grupo (Explorar, Cuenta, Recursos), etiquetas de cada enlace, `aria-label` de
  cada `<nav>`, frase de misión, textos del bloque de atribución (metadata, carátulas,
  operador, no afiliación, no reproducción), aviso de copyright y etiquetas de la
  barra inferior, texto de "volver arriba" y texto accesible "abre en pestaña nueva".
- [ ] 1.2 Crear `messages/es/legal.json` y `messages/en/legal.json` con título y
  cuerpo placeholder para `about`, `terms`, `privacy`, `cookies`, `guidelines`
  (cada uno declara que el documento está en preparación y no es vinculante).
- [ ] 1.3 Registrar `footer` y `legal` en `src/i18n/request.ts`.
- [ ] 1.4 Definir la dirección de contacto: reutilizar constante/variable de entorno
  existente si la hay; si no, crear una única fuente (p. ej. `src/lib/contact.ts` o
  `NEXT_PUBLIC_CONTACT_EMAIL`) y documentarla.

## 2. Componente Footer

- [ ] 2.1 Crear `src/components/layout/Footer.tsx` (Server Component) que recibe
  `user?: Pick<AuthUser, "id" | "username" | "displayName"> | null` y usa
  `getTranslations("footer")` / `getTranslations("common")`.
- [ ] 2.2 Implementar el grupo de identidad: `<Logo />`, `common.appName`,
  `common.tagline`, frase de misión.
- [ ] 2.3 Implementar el grupo "Explorar" como `<nav aria-label>` con `Link` de
  `@/i18n/navigation` a `/search`, `/users`, listas públicas, actividad de la
  comunidad y `/about` ("cómo funciona").
- [ ] 2.4 Implementar el grupo "Cuenta" con render condicional por `user`: anónimo →
  `/auth/login`, `/auth/register`; con sesión → `/users/<username>`, `/me/settings`,
  sesiones/accesos.
- [ ] 2.5 Implementar el grupo "Recursos": `/about`, ayuda y enlace `mailto:` con la
  dirección visible como texto.
- [ ] 2.6 Implementar el bloque de atribución con `border-t border-ink-border`,
  `font-body text-sm text-paper-muted`, enlaces externos a musicbrainz.org,
  coverartarchive.org y metabrainz.org con `target="_blank"`,
  `rel="noopener noreferrer"` y el indicador accesible de pestaña nueva.
- [ ] 2.7 Implementar la barra inferior: aviso de copyright con año
  (`new Date().getFullYear()`) y `common.appName`, y enlaces a `/terms`, `/privacy`,
  `/cookies`, `/guidelines`; ancla "volver arriba" (`<a href="#top">`) sin JS.
- [ ] 2.8 Aplicar el grid responsive (4 → 2 → 1 columna), `overflow-x-clip`, sin
  `sticky`; usar tokens del proyecto y el patrón de hover del `Header`
  (`text-paper-muted` → `text-paper` / `amber`).
- [ ] 2.9 Marcadores de accesibilidad: `<footer>` único, `<nav aria-label>` por
  grupo, `<h2>` reales (estilados pequeños) para los títulos de grupo, `id="top"`
  como destino del ancla.

## 3. Montaje en el layout

- [ ] 3.1 En `src/app/[locale]/layout.tsx`, renderizar `<Footer user={publicUser} />`
  después de `<Providers>{children}</Providers>`, reutilizando el `publicUser` ya
  calculado; envolver el contenido en un contenedor con `id="top"` si hace falta el
  destino del ancla.

## 4. Páginas de políticas placeholder

- [ ] 4.1 Crear `src/app/[locale]/about/page.tsx`, `terms/page.tsx`,
  `privacy/page.tsx`, `cookies/page.tsx`, `guidelines/page.tsx` como Server
  Components estáticos que leen del namespace `legal`.
- [ ] 4.2 Añadir `generateMetadata` por página (título propio + `common.appName`) y
  `robots: { index: false, follow: false }` mientras el contenido sea placeholder.
- [ ] 4.3 Usar un layout de página consistente con el resto (`<main>` centrado,
  `font-display` para el `<h1>`, `font-body` para el cuerpo) e incluir una línea de
  "última actualización: pendiente".

## 5. Documentación

- [ ] 5.1 Añadir en `docs/03-data/data-licensing.md` una nota de que la atribución de
  las tres capas se materializa en el `Footer` (bloque de atribución) y enlaza a las
  fuentes oficiales.
- [ ] 5.2 Si existe un índice de features en `docs/05-features/`, añadir una entrada
  breve del footer; si no, omitir.

## 6. Pruebas

- [ ] 6.1 `src/components/layout/Footer.test.tsx`: renderiza un `contentinfo`;
  cada grupo es `<nav>` con `aria-label`; variante anónima muestra login/registro y
  no perfil; variante con sesión muestra perfil/ajustes y no login; el bloque de
  atribución contiene los tres nombres dentro de enlaces con los `href` correctos y
  `rel` seguro; la barra inferior enlaza a `/terms`, `/privacy`, `/cookies`,
  `/guidelines`; el año del copyright está presente; el `mailto` muestra la dirección.
- [ ] 6.2 Test de humo de las cinco páginas de políticas: renderizan `<h1>` y cuerpo
  en `es` y en `en`, y su metadata declara `noindex`.
- [ ] 6.3 Ajustar `src/app/[locale]/layout.test.tsx` si verifica la estructura del
  layout (ahora incluye `<footer>`).

## 7. Verificación

- [ ] 7.1 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` en verde.
- [ ] 7.2 Verificación manual (dev server): el footer aparece en home, catálogo,
  perfil y páginas de error; se ve correcto en `es` y `en`; responsive a 360px sin
  scroll horizontal; foco de teclado visible; los enlaces de atribución abren las
  fuentes correctas; las páginas de políticas cargan en ambos locales.
- [ ] 7.3 `openspec validate add-site-footer --strict` en verde.
