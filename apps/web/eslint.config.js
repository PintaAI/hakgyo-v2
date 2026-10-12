import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next", "generated", "next-env.d.ts", "public/pdfjs"],
  },
  ...nextVitals,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import Link from ~/components/link, which prefetches on intent instead of on scroll.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/link.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Server pages and layouts prefetch for HydrateClient.
    files: ["src/app/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "UnaryExpression[operator='void'] CallExpression[callee.property.name=/^prefetch(Infinite)?$/]",
          message:
            "Await server prefetches. A query still pending when HydrateClient renders shows a skeleton on the server and data in the browser, which breaks hydration.",
        },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
