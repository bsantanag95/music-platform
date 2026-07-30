# Listas y favoritos

**Fase:** 5 (roadmap). **Estado:** ⚪ conceptual solamente — sin diseño detallado, sin
schema. Este documento existe para no perder lo poco que ya está decidido, no como
especificación lista para implementar.

## Lo que ya está definido

De `01-domain/domain-model.md`:

- **Lista**: colección curada de álbumes, canciones o artistas armada por un usuario.
- **Favorito**: marca simple de un usuario sobre un artista (no sobre álbum ni canción).

Del PRD (`00-product/prd.md`), listas y favoritos quedan explícitamente **fuera del MVP**
— son funciones de Fase 5, posteriores al núcleo social de valoración/comentarios.

## Preguntas abiertas (ninguna resuelta todavía)

- ¿Una lista puede ser colaborativa (varios usuarios editándola)? Mencionado como posible
  en discusiones previas del proyecto, no decidido.
- ¿Una lista puede ser privada, o todas son públicas por diseño (coherente con la
  filosofía de compartir perfil)?
- ¿Puede una lista mezclar artistas, álbumes y canciones al mismo tiempo, o cada lista es
  de un solo tipo de entidad?
- ¿Un favorito admite quitarse, o es una marca de una sola dirección?

## Próximo paso sugerido

No planificar tareas de implementación todavía. Cuando se llegue a la Fase 5, este
documento es el punto de partida para una sesión de diseño dedicada (mismo formato que
`listening-diary-and-ratings.md`), antes de tocar schema o código.
