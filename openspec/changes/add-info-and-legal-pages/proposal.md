## Why

Los enlaces del pie (Acerca de, Ayuda, Términos, Privacidad, Cookies, Directrices) eran marcadores de posición: «Ayuda»
daba 404, «Cómo funciona» y «Acerca de» apuntaban a la misma página y el pie cargaba con cinco párrafos de «Fuentes de
datos» que son transparencia, no navegación. La plataforma necesita una base informativa y legal honesta, escrita para
lo que la aplicación hace de verdad, y una regla para que se mantenga al día.

## What Changes

- Pie: se quita el bloque «Fuentes de datos»; queda una atribución corta (lo que exige la licencia) sin encabezado ni
  enlace a la página de fuentes. Se quita «Cómo funciona» de Explorar (duplicaba «Acerca de»).
- Nueva página `/about/data-sources` (Fuentes de datos): qué viene de dónde, licencias, cómo se obtiene, límites,
  cómo corregir un dato o pedir un retiro. Cuelga de «Acerca de».
- Nueva página `/help` (Ayuda) y contenido real en `/about`, `/terms`, `/privacy`, `/cookies` y `/guidelines`, en español
  e inglés, con un componente común (`InfoPageView`), un registro único de páginas (`src/lib/info-pages.ts`) y los
  textos en `messages/{es,en}/{info,legal}.json`.
- Los documentos vinculantes (términos, privacidad, cookies) llevan un aviso de «pendiente de revisión legal», no se
  indexan y terminan con una sección «Por definir» que lista lo que depende de información que el proyecto no tiene.
- Regla de mantenimiento para agentes (`AGENTS.md`, `docs/05-features/info-pages.md`): quien cambie una funcionalidad
  que afecte lo que estos textos afirman, los actualiza en el mismo cambio.

## Capabilities

### New Capabilities
- `info-pages`: páginas informativas y legales, su estructura, su contenido y su mantenimiento.

### Modified Capabilities
- `site-footer`: navegación «Explorar» y «Recursos» sin duplicados y bloque de atribución compacto.

## Impact

`Footer.tsx`, `messages/{es,en}/footer.json`, `src/components/legal/` (`LegalPlaceholder` → `InfoPageView`),
`src/lib/info-pages.ts`, páginas bajo `src/app/[locale]/{about,about/data-sources,help,terms,privacy,cookies,guidelines}`,
`src/i18n/request.ts` (namespace `info`), tests, `docs/05-features/info-pages.md`, ADR 0060, `docs/03-data/data-licensing.md`
y `AGENTS.md`. Sin migración ni cambios de API.
