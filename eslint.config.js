import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import pluginTypeScript from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    ignores: ["dist/**/*.ts", "dist/**", "eslint.config.js"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  pluginTypeScript.configs.strictTypeChecked,
  pluginTypeScript.configs.stylisticTypeChecked,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  pluginReactHooks.configs["recommended-latest"],
  {
    rules: {
      "no-console": "error",
      "@typescript-eslint/consistent-type-definitions": "off"
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    ignores: ["dist/"],
  },
]);
