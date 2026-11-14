## ADDED Requirements

### Requirement: Páginas informativas y legales con ruta propia

El sistema SHALL ofrecer, en ambos locales, las páginas Acerca de (`/about`), Ayuda
(`/help`), Fuentes de datos (`/about/data-sources`), Directrices de la comunidad
(`/guidelines`), Términos del servicio (`/terms`), Política de privacidad (`/privacy`) y
Política de cookies (`/cookies`). Todas SHALL renderizarse en el servidor con la misma vista
(`InfoPageView`), tener un único `h1`, un `h2` por sección, un índice de anclas cuando tengan
cinco secciones o más, y al pie la fecha de última actualización y enlaces a las demás.
Su existencia, ruta, fecha y estado de revisión legal SHALL declararse en un único registro
(`src/lib/info-pages.ts`).

#### Scenario: Cada página es accesible por su URL

- **WHEN** se solicita cualquiera de las siete rutas en `es` o `en`
- **THEN** responde con la página, con su título, sus secciones y sin claves de traducción crudas

#### Scenario: Fuentes de datos cuelga de Acerca de

- **WHEN** se renderiza `/about`
- **THEN** enlaza a `/about/data-sources`, y esa ruta no aparece en el footer

#### Scenario: Sin enlaces rotos

- **WHEN** un texto de cualquier página enlaza a una ruta interna
- **THEN** esa ruta existe

### Requirement: Contenido bilingüe, sin marcadores y fiel al código

Los textos SHALL vivir en `messages/{es,en}/info.json` (Acerca de, Ayuda, Fuentes de datos) y
`messages/{es,en}/legal.json` (Términos, Privacidad, Cookies, Directrices), con las mismas
secciones, listas, tablas y enlaces en ambos idiomas. El nombre de la aplicación y los correos
de contacto SHALL sustituirse desde `common.appName` y `src/lib/site-links.ts`, no escribirse en
los textos. Los textos SHALL describir solo lo que la aplicación hace hoy; lo que depende de
información que el proyecto no tiene SHALL listarse en una sección «Por definir» en lugar de
afirmarse. La política de cookies SHALL listar cada cookie que la aplicación crea.

#### Scenario: Paridad entre idiomas

- **WHEN** se comparan los textos de `es` y `en` de una página
- **THEN** tienen las mismas secciones (id y orden), la misma cantidad de párrafos, ítems y filas, y los mismos enlaces

#### Scenario: Las cookies documentadas son las que el código crea

- **WHEN** el código define una cookie de la aplicación
- **THEN** la tabla de la política de cookies la lista

### Requirement: Documentos vinculantes pendientes de revisión legal

Mientras `pendingLegalReview` sea verdadero en el registro, Términos, Privacidad y Cookies SHALL
mostrar un aviso de que el documento aún no pasó por una revisión legal, SHALL pedir a los
buscadores no indexarlos (`robots: noindex, nofollow`) y SHALL terminar con una sección «Por
definir» con los puntos abiertos. Las páginas informativas (Acerca de, Ayuda, Fuentes de datos,
Directrices) SHALL indexarse y no llevar el aviso.

#### Scenario: Aviso y noindex en las políticas

- **WHEN** se renderiza `/terms`, `/privacy` o `/cookies`
- **THEN** muestra el aviso de revisión pendiente, declara `noindex` y tiene una sección `pending` con al menos un punto

#### Scenario: Las páginas informativas se indexan

- **WHEN** se renderiza `/about`, `/help`, `/about/data-sources` o `/guidelines`
- **THEN** no muestra el aviso y no declara `noindex`

### Requirement: Fuentes de datos documentadas en una página propia

`/about/data-sources` SHALL explicar, para cada fuente que la aplicación consulta (MusicBrainz, Cover Art
Archive, Wikidata, Wikipedia, Wikimedia Commons, ListenBrainz, setlist.fm), los premios y salones curados a
mano y lo que aporta la comunidad: qué se usa, con qué licencia, cómo se obtiene, qué límites tiene y cómo
corregir un dato o pedir un retiro. El contacto de retiro de carátulas SHALL ser `COVER_ART_TAKEDOWN_EMAIL`
y, sin él, el contacto general.

#### Scenario: Todas las fuentes nombradas

- **WHEN** se renderiza `/about/data-sources`
- **THEN** nombra cada una de las fuentes anteriores

### Requirement: Mantenimiento de los textos junto con el código

Quien cambie una funcionalidad que afecte lo que estos textos afirman (datos personales, cookies o
almacenamiento local, proveedores, fuentes de datos, moderación, retención, seguridad, funciones de la
guía) SHALL actualizar el texto correspondiente en ambos idiomas, la fecha de la página en el registro y
la sección «Por definir» si resuelve un punto, en el mismo cambio. La regla vive en `AGENTS.md` y en
`docs/05-features/info-pages.md`, que además mapea qué cambio obliga a tocar qué página.

#### Scenario: Una cookie nueva

- **WHEN** un cambio crea una cookie nueva
- **THEN** la política de cookies la lista y los tests fallan hasta que lo haga
