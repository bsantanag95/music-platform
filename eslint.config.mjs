import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/next-env.d.ts",
      // Worktrees locales anidados: copias completas del repo que no deben
      // lintarse desde el árbol principal.
      ".claude/worktrees/**",
    ],
  },
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["FormEvent", "FormEventHandler"],
              message:
                "FormEvent y FormEventHandler están deprecated en @types/react. Usar SubmitEventHandler, ChangeEventHandler, InputEventHandler o SyntheticEvent según el tipo de evento.",
            },
            {
              name: "next/image",
              message:
                "Importá AppImage desde @/components/ui/AppImage: es el único punto que envuelve next/image y decide cuándo saltear el optimizador (openspec: mirror-cover-art).",
            },
          ],
        },
      ],
    },
  },
  {
    // Excepción: el wrapper es el único archivo que puede importar next/image.
    // Conserva la restricción de `react` del bloque anterior.
    files: ["src/components/ui/AppImage.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["FormEvent", "FormEventHandler"],
              message:
                "FormEvent y FormEventHandler están deprecated en @types/react. Usar SubmitEventHandler, ChangeEventHandler, InputEventHandler o SyntheticEvent según el tipo de evento.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
