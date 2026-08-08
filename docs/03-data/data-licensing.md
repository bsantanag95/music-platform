# Licencia de datos — music-platform

Tres capas distintas, cada una con reglas propias. Es el punto donde más proyectos similares se meten en problemas legales sin darse cuenta, porque se asume que "es de MusicBrainz" implica una sola licencia uniforme.

## A) Metadata de MusicBrainz (nombres, discografías, relaciones)

La base se divide en dos licencias:
- **Datos "core"** (la mayoría): CC0 — dominio público, uso libre incluso comercial, sin restricciones.
- **Datos suplementarios** (parte de las relaciones/anotaciones editadas por la comunidad): CC BY-NC-SA 3.0 — exige atribución, prohíbe uso comercial, y obliga a compartir cualquier derivado bajo la misma licencia.

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

**Evolución futura condicionada (no es una decisión tomada):** la app hotlinkea hoy las
miniaturas de CAA, que redirige a Archive.org — una dependencia de disponibilidad de terceros
documentada como riesgo conocido (ver `frontend-plan/04-risks.md`, riesgo 9). Si las métricas
de la Fase 3 mostraran una degradación relevante, se podrían evaluar cache HTTP/CDN, proxy
propio, endpoint de imágenes u Object Storage. **Cualquier estrategia que almacene y sirva
copias propias** de las portadas — aunque sea en baja resolución — debe re-evaluarse primero
bajo esta política: son material con copyright de las disqueras y parte del arte cargado en CAA
tiene condiciones de licencia propias. La adopción de una capa propia no está decidida de
antemano; se elegirá comparando licencia, disponibilidad, latencia, coste y complejidad
operativa.

## Gates a revisar antes de monetizar

1. ¿El proyecto necesita plan comercial de API de MusicBrainz, o conviene auto-hospedar el espejo de datos?
2. ¿Se sigue respetando la política de carátulas en baja resolución como decisión de producto, no solo como optimización técnica?
3. Si en algún momento se necesita cover art en alta resolución sin esta limitación, evaluar licenciamiento directo con sellos o un proveedor de metadata comercial.
