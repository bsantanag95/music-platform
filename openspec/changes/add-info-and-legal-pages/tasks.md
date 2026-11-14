## 1. Estructura

- [x] 1.1 `InfoPageView` (vista común: lead, índice, secciones, tablas, enlaces relacionados) reemplaza a `LegalPlaceholder`
- [x] 1.2 `src/lib/info-pages.ts`: registro de páginas, sustitución de marcadores, props y metadata
- [x] 1.3 Namespace `info` en `src/i18n/request.ts` y páginas `/about`, `/about/data-sources`, `/help`, `/terms`, `/privacy`, `/cookies`, `/guidelines`

## 2. Contenido (es y en)

- [x] 2.1 Acerca de, Ayuda y Fuentes de datos (`info.json`)
- [x] 2.2 Términos, Privacidad, Cookies y Directrices (`legal.json`), conservando los textos de cuenta ya vigentes
- [x] 2.3 Secciones «Por definir» con lo que depende de información ausente

## 3. Footer

- [x] 3.1 Quitar «Fuentes de datos» y «Cómo funciona»; atribución compacta con retiro de carátulas condicional

## 4. Verificación y documentación

- [x] 4.1 Tests: renderizado, paridad es/en, rutas internas existentes, cookies documentadas = cookies del código, footer
- [x] 4.2 `docs/05-features/info-pages.md`, ADR 0060, `data-licensing.md`, índices de docs y `AGENTS.md`
- [x] 4.3 `pnpm run typecheck`, `lint`, `test`, `build` y revisión en el navegador
- [ ] 4.4 Revisión humana de los puntos «Por definir» y revisión legal (fuera de este cambio)
