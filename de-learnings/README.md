# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Running the app

For lesson development, use the Vite dev server (hot reload):

```bash
npm install
npm run dev        # http://localhost:5173
```

To run a built copy locally with **Docker** (no Node toolchain needed — the image
just builds the static app and serves it with nginx):

```bash
# from this de-learnings/ directory
docker build -t de-learnings .
docker run --rm -p 8080:80 de-learnings      # http://localhost:8080
```

or with Compose:

```bash
docker compose up --build                    # http://localhost:8080
```

The image is a multi-stage build (`node:22-alpine` to compile → `nginx:1.27-alpine`
to serve `dist/`). The app uses HashRouter, so deep links like
`http://localhost:8080/#/lesson/1.4.1` work without extra server config.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
