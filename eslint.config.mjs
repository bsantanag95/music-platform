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
      "out/**",
      "build/**",
      "next-env.d.ts",
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
          ],
        },
      ],
    },
  },
];

export default eslintConfig;