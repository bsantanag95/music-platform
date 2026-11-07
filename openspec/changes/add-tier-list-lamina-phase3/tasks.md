## 1. Servicio y API

- [x] 1.1 Fuente `lamina` en `src/services/laminas/tiers.ts` (lectura con las reglas públicas, ítems en niveles en orden, sin bandeja, `copyLabels`,
  tipo, propia); pruebas
- [x] 1.2 `getTierInspiration` con el resumen de una tier list (cantidad, etiquetas, si son propias); pruebas
- [x] 1.3 Esquema de `POST /api/me/laminas` con la fuente nueva; pruebas; `docs/04-api/contracts.md`

## 2. Interfaz

- [x] 2.1 `/me/laminas?desde=`: formulario de tier list inspirado (fuente "Como la de @usuario", resumen, casilla de etiquetas); pruebas
- [x] 2.2 `LaminaCta` en la página pública de una tier list para quien no es su dueño, con textos propios; pruebas
- [x] 2.3 "Armar tier list" en la discografía propia; pruebas

## 3. Documentación y textos

- [x] 3.1 `docs/05-features/sharing.md` (§4.3, §6, estado) y `docs/01-domain/business-rules.md`
- [x] 3.2 Textos es/en y `client-messages`
- [x] 3.3 Smoke `scripts/smoke-test-tier-laminas.ts` ampliado y su entrada en `AGENTS.md`

## 4. Verificación

- [x] 4.1 Smoke contra Postgres real: fuente `lamina` (nivel por la nota propia, sin bandeja, orden, etiquetas con y sin copia, privada, oculta,
  bloqueo, propia, tipo distinto), inspiración por visitante
- [x] 4.2 `scripts/smoke-test-google-oauth.ts` sigue pasando con la intención de Lámina
- [x] 4.3 Navegador con el build final, en escritorio y a 375 px: "Arma la tuya" con sesión y con registro, copiar o no las etiquetas, botón de la
  discografía
- [x] 4.4 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-tier-laminas.ts` pasa contra Postgres real (BD de scratch) con la Fase 3: un disco que la seguidora valoró con 72 cae en B, los demás
  en su bandeja en el orden de la otra, sin la bandeja ajena, privada y sin notas, S a E sin copiar y las etiquetas ajenas copiando (cambiarlas no toca las
  de la otra, que tampoco cambia), y `LAMINA_NOT_FOUND` para quien no sigue una tier list para seguidores, para la propia, oculta y con un bloqueo;
  `VALIDATION_ERROR` de otro tipo. `getTierInspiration` cuenta lo que hay en niveles, avisa las etiquetas propias, no trae ítems ni notas y es `null` para
  la propia, una que no se puede ver y con un bloqueo. `scripts/smoke-test-google-oauth.ts` sigue pasando con la intención de Lámina.
- Navegador con el build final, una tier list pública de otra cuenta de prueba (etiquetas propias, 12 discos en la bandeja) y la BD de scratch: como
  anónimo, el llamado "¿Cómo la armarías tú?" con `lamina=<id>`; registro que llega a `/me/laminas?desde=<id>` con el formulario de tier list primero, la
  fuente "Como la de @…", 8 discos y la casilla de etiquetas apagada; armada con las etiquetas copiadas, privada, con esos 8 discos por la nota propia; con
  sesión, el llamado va directo al formulario; "Armar tier list" en la discografía propia la crea en un toque y lleva al editor. A 375 px, sin
  desplazamiento horizontal en el formulario inspirado ni en la página pública.
- `pnpm run typecheck`, `lint`, la suite completa (707 archivos, 7005 pruebas) y `build` pasan.
