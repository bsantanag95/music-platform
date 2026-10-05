# Licencia de datos — music-platform

Tres capas distintas, cada una con reglas propias. Es el punto donde más proyectos similares se meten en problemas legales sin darse cuenta, porque se asume que "es de MusicBrainz" implica una sola licencia uniforme.

## A) Metadata de MusicBrainz (nombres, discografías, relaciones)

La base se divide en dos licencias:
- **Datos "core"** (la mayoría): CC0 — dominio público, uso libre incluso comercial, sin restricciones.
- **Datos suplementarios** (parte de las relaciones/anotaciones editadas por la comunidad): CC BY-NC-SA 3.0 — exige atribución, prohíbe uso comercial, y obliga a compartir cualquier derivado bajo la misma licencia.

**Qué usamos (cambio `enrich-album-editions-and-credits`):** ediciones, sellos, números de
catálogo, formatos y las relaciones artista ↔ edición/grabación de los créditos de personal
(instrumentos, voz, producción, ingeniería, arte) son datos centrales de MusicBrainz (CC0). No
se ingieren anotaciones, tags ni ratings de MusicBrainz, que son los datos suplementarios.

**Implicancia práctica:** no bloquea el MVP. El riesgo aparece solo si el proyecto monetiza usando específicamente esos datos suplementarios a gran escala — en ese punto, MetaBrainz ofrece licenciamiento comercial directo.

## B) El servicio API en vivo (distinto de los dumps descargables)

La API en vivo de musicbrainz.org tiene términos propios, separados de la licencia de los datos: uso no comercial es gratuito; uso comercial requiere contactar a MetaBrainz para un plan pagado. El patrón de cacheo bajo demanda (Fase 2 del roadmap) consulta esta API en vivo, así que esta distinción aplica directo a la arquitectura del proyecto.

**Dos caminos al momento de monetizar:**
1. Contratar el plan comercial de MetaBrainz, o
2. Auto-hospedar un espejo de la base usando los dumps CC0 — ahí ya no se depende del servicio en vivo, solo de la licencia de los datos.

**Reglas técnicas obligatorias mientras se use la API en vivo:**
- Máximo 1 request/segundo por IP.
- `User-Agent` identificable (nombre de la app + forma de contacto) — un `User-Agent` genérico entra en la lista de "anónimos" y recibe throttling agresivo.

## C) Cover Art Archive — el punto de mayor exposición legal

La metadata de qué imágenes existen es abierta, pero **las imágenes en sí son portadas de discos con copyright de las disqueras** — están explícitamente marcadas como copyrighted, no CC0. No es lo mismo que la metadata textual de A y B.

**Decisión de producto adoptada:** tratarlas como Wikipedia trata las portadas de álbum — uso de baja resolución, con fines de identificación/catalogación del contenido, no como elemento decorativo a resolución completa. Es la práctica estándar de la industria (Discogs, RateYourMusic, Last.fm operan así) y la ruta más defendible sin pagar licencia por portada.

**Política vigente — espejo propio de baja resolución (ADR 0018):** la app mantiene un espejo
de la miniatura `front-250` en Object Storage (R2 detrás del CDN de Cloudflare) bajo condiciones
verificables que hacen defendible alojar copias:

- solo baja resolución (`front-250`), recodificada a WebP con lado mayor ≤250 px; nunca otra
  variante ni resolución completa;
- el espejo **sigue a la fuente**: una revalidación periódica vuelve a consultar CAA y borra o
  reemplaza la copia si la portada fue retirada o cambió;
- **retiro a pedido**: existe un procedimiento inmediato que borra la copia y marca el álbum
  para que no se vuelva a resolver, y el **contacto público de retiro es un requisito técnico de
  habilitación** del espejo (`COVER_ART_TAKEDOWN_EMAIL`, publicado en el bloque de atribución del
  footer);
- **sin exposición como colección**: las carátulas se sirven solo por su URL exacta, en el
  contexto de su álbum; no hay endpoint que liste o permita descargar en bloque;
- la **atribución** de siempre (bloque del footer) se mantiene.

El espejo se habilita solo con storage configurado **y** el contacto de retiro presente; si falta
cualquiera de los dos, la app vuelve al hotlink y no aloja copias. La medición que activó la
reevaluación (riesgo 9) y las decisiones completas están en
`docs/02-architecture/adr/0018-espejo-de-caratulas.md`. Los gates de monetización de abajo siguen
vigentes.

**Géneros y etiquetas (cambio `enrich-artist-profile`):** los géneros de MusicBrainz son una
lista curada de **etiquetas**, así que son datos suplementarios (CC BY-NC-SA 3.0, no comerciales).
No se ingieren; la fuente de los géneros del artista queda pendiente (la alternativa CC0 es la
propiedad de género de Wikidata, D).

**Géneros resueltos (cambio `add-genre-taxonomy`, ADR 0023):** se separan dos cosas que
MusicBrainz publica con licencias distintas.

- **La taxonomía** (la lista de géneros con su MBID y sus relaciones "subgénero de", "fusión de"
  e "influido por") viene del **dump core** (`mbdump.tar.bz2`, tablas `genre`, `l_genre_genre`,
  `link`, `link_type`): **CC0**. Se genera offline a `data/genres/taxonomy.json`.
- **Los votos de género por artista, álbum o grabación** (`inc=genres`, tablas `*_tag` del dump
  `mbdump-derived`) siguen siendo **CC BY-NC-SA 3.0** y **siguen sin ingerirse**: ninguna request
  pide `genres` ni `tags` (un test del cliente lo verifica).
- **Los géneros de cada artista y álbum** salen de **Wikidata P136 (CC0)**, igual que los nombres
  de los géneros en español (P8052). Se llega a Wikidata solo por la relación `wikidata` que
  MusicBrainz declara para el artista o el álbum (D).

- **Los votos de la comunidad** (cambio `add-genre-votes`, ADR 0025) son datos **propios** de la plataforma, generados
  por sus usuarios; no tienen relación con los votos de MusicBrainz, que siguen sin ingerirse.

Todo lo que se guarda de géneros es CC0 o propio; no se suman obligaciones de atribución.

## D) Wikidata, Wikipedia y Wikimedia Commons (perfil de artista, ADR 0021)

Se llega a las tres solo desde la relación `wikidata` que MusicBrainz declara para un artista.
Cada una tiene su licencia:

- **Wikidata** (descripción corta, lugar de nacimiento o formación, enlaces a los artículos):
  CC0, uso libre sin atribución obligatoria.
- **Wikipedia** (resumen del artículo): texto **CC BY-SA 4.0**. Toda superficie que muestre el
  resumen incluye la atribución visible "Fuente: Wikipedia" con enlace al artículo y a la
  licencia. El texto no se modifica ni se traduce; la cabecera muestra un fragmento que enlaza al
  texto completo.
- **Wikimedia Commons** (foto del artista): **licencia por archivo**. Solo se acepta una foto de
  la propiedad de imagen de Wikidata con una licencia libre verificada en sus metadatos (dominio
  público, CC0, CC BY o CC BY-SA en cualquier versión); se rechaza lo marcado como no libre o sin
  licencia. Se guardan autor, licencia y enlaces al archivo y a la licencia, y la página del
  artista muestra el crédito bajo la foto. Nunca se usa la miniatura del resumen de Wikipedia, que
  puede ser una imagen de uso justo. Se sirve una miniatura de a lo sumo 500 px.

**Textos de género (ADR 0027):** la introducción de Wikipedia del género (es y en) también es **CC BY-SA 4.0**.
Se llega al ítem solo por `genre.wikidata_id` (la declaración P8052 atada al MBID, nunca por el nombre), se guarda sin
modificar ni traducir, y toda página que lo muestra incluye junto al texto «Fuente: Wikipedia» con enlace al artículo
(con su título, que puede diferir del nombre mostrado) y a la licencia. No hay retiro a pedido: un texto equivocado se
corrige en la siguiente sincronización (30 días) o con `scripts/backfill-genre-about.ts --force --slug`.

**Retiro a pedido:** `scripts/takedown-artist-photo.ts` quita la foto de un artista y lo marca
para que el enriquecimiento no se la vuelva a asignar.

**Reglas técnicas:** User-Agent con contacto (`WIKIMEDIA_USER_AGENT`), requests serializadas y
`maxlag` en la API de Wikidata, según la política de uso de las APIs de Wikimedia.

## Dónde se materializa la atribución

El bloque de atribución del **pie de página global** (`src/components/layout/Footer.tsx`,
cambio `add-site-footer`) es el punto visible y persistente donde se cumplen A, B y C:
nombra y enlaza a MusicBrainz (CC0 + parte CC BY-NC-SA 3.0), al Cover Art Archive
(baja resolución, fines de identificación, copyright de sus titulares) y a la
MetaBrainz Foundation, más la aclaración de no afiliación. Si cambian las condiciones
de licencia de MetaBrainz, el texto de ese componente (`messages/{es,en}/footer.json`,
clave `attribution`) es lo que hay que actualizar.

La atribución de Wikipedia y de las fotos de Commons (D) no va en el footer: es por contenido y
se muestra junto al resumen y bajo la foto, en la página del artista, y junto al texto «Sobre el género» en la
página de género.

## Gates a revisar antes de monetizar

1. ¿El proyecto necesita plan comercial de API de MusicBrainz, o conviene auto-hospedar el espejo de datos?
2. ¿Se sigue respetando la política de carátulas en baja resolución como decisión de producto, no solo como optimización técnica?
3. Si en algún momento se necesita cover art en alta resolución sin esta limitación, evaluar licenciamiento directo con sellos o un proveedor de metadata comercial.
