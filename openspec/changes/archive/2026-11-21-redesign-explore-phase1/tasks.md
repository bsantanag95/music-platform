## 1. Barra de pasillos

- [x] 1.1 Franja `sticky` bajo la cabecera global para `ExploreJumpNav`, con estilo de pestañas de texto y subrayado ámbar en la actual
- [x] 1.2 `JumpNavLinks` (cliente): medición por cuadro con la línea de cabecera + barra, `aria-current="true"` en el enlace visible, última sección al llegar al final, `scrollIntoView` horizontal de la fila en pantallas angostas
- [x] 1.3 `scroll-margin-top` de las secciones a cabecera + barra
- [x] 1.4 Tests: enlaces y anclas sin JavaScript, sección marcada al observarla, omisión con menos de 4 secciones

## 2. Marco y jerarquía

- [x] 2.1 Mover `HomeSectionHeading` a `src/components/ui/SectionHeading.tsx` y actualizar Inicio
- [x] 2.2 `SectionHeader size="page"`; `headingSize="page"` en `AlbumRail` y `CollectionRail` (por defecto igual que hoy); tamaño de página directo en las secciones solo de Explorar
- [x] 2.3 Portada de Explorar: `max-w-[88rem]`, márgenes fluidos, `gap-16 lg:gap-24`, `<h1>` en la escala de Inicio y frase `catalog.explore.intro` (es/en)

## 3. Correcciones

- [x] 3.1 `PopularNow`: lista en `minmax(0, 1fr)` y filas `min-w-0`, sin desborde a 390 px
- [x] 3.2 `FAMILY_STAMP_CLASS` a 11 px

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/explore.md`: barra de pasillos, marco y plan de las Fases 2 y 3
- [x] 4.3 `pnpm run verify` (typecheck, lint, tests del diff) y `pnpm run build`
- [x] 4.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: barra fija con la sección marcada, saltos sin tapar títulos, sin desbordes; la página de género y el hub de colecciones sin cambios visibles
