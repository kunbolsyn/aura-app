# React + TypeScript + Vite

## Supabase setup

1. In the Supabase dashboard, open **Project Settings > API** and copy the **Project URL** and the public **Publishable key** (or legacy `anon` key).
2. Create `.env.local` in the project root using `.env.example` as the template:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never put a `service_role` or secret key in a `VITE_` variable. Vite exposes `VITE_` values to the browser. 3. In **SQL Editor**, open and run [`supabase/schema.sql`](supabase/schema.sql). This creates the four workspace tables, indexes, foreign keys, and Row Level Security policies. 4. In **Authentication > Providers**, enable **Email**. For local development, add `http://localhost:5173/` and `http://127.0.0.1:5173/` under **URL Configuration > Redirect URLs**. Enable Google only after configuring its OAuth client credentials. 5. Start the app with `npm run dev` and create an account. If email confirmation is enabled, confirm the message before signing in.

### Security model

The browser uses only the public Supabase key. Every workspace row stores its `user_id`, and every table has RLS enabled with policies requiring `user_id = auth.uid()`. Tasks and events also verify that their list or calendar belongs to the same authenticated user. Supabase applies these policies to every request, so changing an id in the address bar or manually issuing a REST request cannot read another user's rows.

Do not disable RLS and do not use the service-role key in this frontend. In production, replace the local development redirect URLs with the deployed HTTPS origin and keep email confirmation enabled.

The app loads workspace data only after Supabase restores a session. User data is no longer stored in shared local storage; only the dark-mode preference remains local.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
