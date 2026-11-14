# Páginas informativas y legales

Cambio `add-info-and-legal-pages` (2026-11), ADR 0060. Las páginas que explican qué es la plataforma, cómo se usa, de dónde
salen los datos y bajo qué reglas se usa. Son una promesa pública: **describen lo que la aplicación hace hoy, nunca lo que
se quiere que haga.**

## Páginas

| Página | Ruta | Archivo de texto | Propósito | Estado |
|---|---|---|---|---|
| Acerca de | `/about` | `info.json › about` | Identidad: qué es, para quién, qué no es, principios, estado del proyecto, contacto. Es el eje: enlaza al resto | informativa |
| Fuentes de datos | `/about/data-sources` | `info.json › dataSources` | Transparencia: qué viene de dónde, licencias, cómo se obtiene, límites, corregir o pedir un retiro | informativa |
| Ayuda | `/help` | `info.json › help` | Cómo usar cada parte de la aplicación, por tema | informativa |
| Directrices de la comunidad | `/guidelines` | `legal.json › guidelines` | Qué se espera, qué no se permite, cómo se reporta y se modera | informativa |
| Términos del servicio | `/terms` | `legal.json › terms` | Condiciones de uso (vinculante) | **pendiente de revisión legal** |
| Política de privacidad | `/privacy` | `legal.json › privacy` | Qué datos se tratan, para qué, quién los ve, retención, derechos, cuenta | **pendiente de revisión legal** |
| Política de cookies | `/cookies` | `legal.json › cookies` | Cookies y almacenamiento local | **pendiente de revisión legal** |

Qué es descriptivo y qué es vinculante: Acerca de, Ayuda y Fuentes de datos informan; Términos, Privacidad y Cookies son las
condiciones (y por eso llevan aviso, `noindex` y su lista «Por definir»); las Directrices son normas de convivencia que los
Términos incorporan.

## Dónde se ven

- **Pie:** «Acerca de» y «Ayuda» (Recursos); Términos, Privacidad, Cookies y Directrices (barra legal). **«Fuentes de datos» no
  está en el pie**: cuelga de «Acerca de» y del bloque «Más información» al final de cada página informativa. El pie solo
  conserva la atribución corta que exige la licencia (`03-data/data-licensing.md`, «Dónde se materializa la atribución»).
- **Cada página** termina con «Más información» (enlaces a las demás) y la fecha de última actualización.

## Cómo está hecho

- `src/lib/info-pages.ts`: registro (ruta, namespace, fecha, `pendingLegalReview`), orden de los enlaces cruzados, sustitución
  de `{appName}`, `{contactEmail}` y `{takedownContact}`, props y metadata (`noindex` solo si falta la revisión legal).
- `src/components/legal/InfoPageView.tsx`: vista común (índice de anclas desde 5 secciones, secciones, tablas con región
  desplazable y encabezados de fila y columna, enlaces `[texto](destino)`).
- Páginas: `src/app/[locale]/{about,about/data-sources,help,terms,privacy,cookies,guidelines}/page.tsx` (todas idénticas salvo el id).
- Contenido: `{ title, lead, sections: [{ id, title, paragraphs?, items?, table? }] }`. Una sección nueva es una entrada nueva; no
  hace falta tocar código. Los `id` y la cantidad de párrafos/ítems/filas deben coincidir entre `es` y `en`.
- Contacto: `CONTACT_EMAIL` y `COVER_TAKEDOWN_EMAIL` de `src/lib/site-links.ts`. El retiro de carátulas usa el segundo y, sin
  configurar, el primero.

## Regla de mantenimiento (obligatoria)

**Quien implemente o modifique una funcionalidad que cambie algo de lo que afirman estas páginas, las actualiza en el mismo
cambio**, manteniendo la lógica y el tono ya escritos: ambos idiomas, la fecha de la página en `INFO_PAGES` y, si el cambio
resuelve un punto de «Por definir», quitarlo de esa lista (y de este documento). No se inventan garantías, plazos ni
procedimientos: si falta información, se agrega un punto a «Por definir».

| Si el cambio… | Actualizar |
|---|---|
| Crea, renombra o cambia la duración de una cookie, o usa `localStorage`/`sessionStorage` | `cookies` (tabla y almacenamiento local); un test falla si falta una cookie del código |
| Agrega un dato personal nuevo, o cambia quién lo ve, cómo se borra o exporta | `privacy` (tabla «Qué datos tratamos», visibilidad, retención, derechos, cuenta); `help` si cambia un flujo |
| Cambia la sesión, el hash, el rate limiting o el transporte de correo | `privacy › security/retention`, `cookies` (duraciones) |
| Suma un proveedor externo (analítica, correo, almacenamiento, pagos, publicidad) | `privacy › providers`, `cookies › third`, `terms` (condiciones comerciales) y, si hay analítica o publicidad, replantear el consentimiento |
| Suma o cambia una fuente de datos, una licencia o la política de carátulas/fotos | `dataSources`, y `03-data/data-licensing.md`; la atribución del pie si cambia lo que la licencia exige |
| Cambia la moderación, las sanciones o los reportes | `guidelines`, `terms › moderation`, `help › report` |
| Agrega, quita o renombra una función o ajuste que `help` describe | `help` (y `about` si cambia lo que la plataforma es o no es) |
| Cambia la edad mínima, la entidad, la jurisdicción, los proveedores o la retención | las secciones afectadas y la lista «Por definir» |
| Agrega una página informativa | `INFO_PAGES` + `INFO_PAGE_ORDER`, los dos `json`, esta tabla y `openspec/specs/info-pages` |

## Pendiente de decisión humana (lo que el proyecto no sabe)

Aparece en las propias páginas, en «Por definir»; aquí, el resumen:

1. **Entidad responsable** del servicio y del tratamiento de datos (nombre, forma jurídica, domicilio).
2. **Ley aplicable y jurisdicción**, y qué leyes de protección de datos aplican (RGPD, leyes de América Latina…).
3. **Edad mínima** y, si procede, consentimiento parental. Hoy no se pregunta ni se verifica la edad.
4. **Proveedores reales**: alojamiento, base de datos, correo (Resend está previsto), almacenamiento (R2 previsto), CDN; dónde
   se alojan los datos y si hay transferencias internacionales.
5. **Retención** de copias de seguridad y registros técnicos, de cuentas desactivadas y de datos con obligación legal.
6. **Brechas de seguridad**: procedimiento y plazos de aviso.
7. **Revisión de decisiones de moderación** (plazos y canal) y **plazos de respuesta** a solicitudes de derechos.
8. **Consentimiento de cookies**: las cookies `tz` y `NEXT_LOCALE` se crean automáticamente al visitar; confirmar con asesoría legal si exige aviso.
9. **Buzón de contacto real**: `CONTACT_EMAIL` (`hola@music-platform.app`) y las redes del pie son marcadores de posición;
   mientras no existan, los textos remiten a un correo que no recibe nada.
10. **Revisión legal completa** de Términos, Privacidad y Cookies (licencia de contenido, limitación de responsabilidad,
    aceptación por uso, cambios unilaterales) y paso de `pendingLegalReview` a `false`.
11. **Monetización**: MetaBrainz exige plan comercial para la API en vivo y los datos suplementarios son no comerciales
    (`data-licensing.md`, «Gates a revisar antes de monetizar»); cualquier cobro o publicidad obliga a revisar Fuentes de datos,
    Términos y Privacidad.
