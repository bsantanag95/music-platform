# ADR 0050: Valoración compartida e imagen privada del dueño

**Estado:** Aceptada (2026-11-06, `add-share-user-actions-phase2`)

## Contexto

Compartir una valoración exige que quien abre el enlace pueda verla, pero `rating` no tiene audiencia: la ven el dueño y sus
seguidores. Solo hay dos excepciones, ambas públicas por decisión del dueño: las destacadas (tope de 6, cambian la vitrina del
perfil) y la que acompaña a una reseña.

Además, el ADR 0049 y `business-rules.md` fijan que lo compartido se calcula siempre como anónimo. Eso deja sin imagen a quien quiere
subir a Instagram una valoración o una escucha sin publicarla en la app, y a todo perfil privado.

## Decisión

1. **Marca por valoración.** La tabla `rating_share` (`0081`) hace pública una sola valoración, sin tope y de forma reversible. Va
   aparte, como `rating_highlight`, para no disparar `trg_rating_touch`: `rating.updated_at` ordena el feed y "Mis valoraciones".
   Solo afecta a la página de relación y a la imagen. Feed, huella, afinidad y agregados siguen igual.
2. **La marca muestra el puntaje detallado**, como las destacadas (`define-detailed-score`, D7): es una decisión explícita del dueño.
   La reseña, que es pública sin ese gesto, sigue mostrando solo estrellas.
3. **La marca sobrevive a editar la valoración:** el enlace ya circula y muestra la nota vigente. Borrar la valoración la borra.
4. **Imagen privada del dueño.** `?personal=1` genera la imagen de una valoración o escucha para su dueño, con su sesión y `Cache-Control:
   private, no-store`. Es la única excepción a "se calcula como anónimo": no se anuncia en metadatos, no entra a ninguna caché compartida
   y a cualquier otro visitante le responde la imagen genérica.
5. **Sin caché inmutable.** La imagen pública de una valoración o escucha lleva siempre la caché corta: el dueño puede cerrarla, y una
   copia inmutable en un CDN seguiría visible.

## Alternativas descartadas

- **Columna `audience` en `rating`:** coherente con escuchas y favoritos, pero obliga a revisar feed, huella, afinidad, destacadas y
  exportación, y a sumar el control en la interfaz, para un caso que solo necesita abrir una fila.
- **Reutilizar las destacadas:** tope de 6 y compartir cambiaría el perfil.
- **Sin imagen hasta hacerlo público:** más simple, pero un perfil privado no podría compartir nada de lo suyo.

## Consecuencias

- Hay tres formas de que un anónimo vea una valoración: marca, destacada o reseña. La página de relación y el objetivo aceptan las dos
  primeras.
- Un perfil que pasa a privado conserva sus marcas sin efecto: `audiencesForProfile` manda sobre ellas.
- La imagen privada se genera a pedido, sin caché, con el mismo límite por IP que el resto.
